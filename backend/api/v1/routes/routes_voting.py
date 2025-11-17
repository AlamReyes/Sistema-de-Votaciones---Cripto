from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from core.deps import get_current_user, get_current_admin
from db.models.user import User
from db.session import get_db
from db.repositories.voting import BlindTokenRepository, VotingReceiptRepository
from db.repositories.election import ElectionRepository
from services.voting_service import VotingService
from services.election_service import ElectionService
from crypto.voting_crypto import VotingCrypto
from api.v1.schemas.voting import (
    BlindTokenCreate,
    BlindTokenResponse,
    BlindTokenSign,
    BlindTokenStatus,
    VoteCreate,
    VoteResponse,
    VoteWithReceiptCreate,
    VoteWithReceiptResponse,
    VotingReceiptCreate,
    VotingReceiptResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voting", tags=["Voting"])


def get_voting_service(db: AsyncSession = Depends(get_db)) -> VotingService:
    return VotingService(db)


def get_election_service(db: AsyncSession = Depends(get_db)) -> ElectionService:
    return ElectionService(db)


def get_token_repo(db: AsyncSession = Depends(get_db)) -> BlindTokenRepository:
    return BlindTokenRepository(db)


def get_receipt_repo(db: AsyncSession = Depends(get_db)) -> VotingReceiptRepository:
    return VotingReceiptRepository(db)


def get_election_repo(db: AsyncSession = Depends(get_db)) -> ElectionRepository:
    return ElectionRepository(db)


# ============================================================================
# BLIND TOKEN ENDPOINTS
# ============================================================================

@router.post("/blind-tokens", response_model=BlindTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_blind_token(
    data: BlindTokenCreate,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    election_repo: ElectionRepository = Depends(get_election_repo),
    election_service: ElectionService = Depends(get_election_service),
    current_user: User = Depends(get_current_user),
):
    """
    Crear un token cegado para una elección.
    El usuario envía su token cegado y se firma automáticamente con la llave de la institución.
    Solo se permite un token por usuario por elección.
    """
    # Verificar que el usuario sea el mismo que el token
    if data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create token for another user"
        )

    # Verificar que la elección esté abierta
    is_open = await election_service.is_voting_open(data.election_id)
    if not is_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election is not open for voting"
        )

    # Verificar que el usuario no tenga ya un token para esta elección
    existing_token = await token_repo.get_user_token(data.user_id, data.election_id)
    if existing_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a blind token for this election"
        )

    # Obtener la elección para acceder a su clave de firma
    election = await election_repo.get(data.election_id)
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found"
        )

    # Validar que la elección tenga una clave de firma válida
    if not election.blind_signature_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Election does not have a valid signature key. Please contact administrator."
        )

    if not election.blind_signature_key.startswith("-----BEGIN"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Election signature key is invalid (not PEM format). Please recreate the election."
        )

    # Validar formato del token cegado (debe ser hexadecimal)
    try:
        # Verificar que sea hexadecimal válido
        bytes.fromhex(data.blinded_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blinded token must be a valid hexadecimal string"
        )

    # Crear el token cegado
    token = await token_repo.create_blind_token(
        user_id=data.user_id,
        election_id=data.election_id,
        blinded_token=data.blinded_token,
    )

    # FIRMA AUTOMÁTICA: Firmar el token con la clave de la institución
    try:
        signed_token = VotingCrypto.blind_sign(
            data.blinded_token,
            election.blind_signature_key
        )
        # Actualizar el token con la firma
        await token_repo.sign_token(token.id, signed_token)
        # Recargar el token para obtener la firma
        token = await token_repo.get(token.id)

        if not token or not token.signed_token:
            logger.error(f"Token {token.id if token else 'unknown'} was not signed properly")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to sign token. Database update failed."
            )

        logger.info(f"Token {token.id} signed automatically for user {data.user_id}")

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"Failed to sign blind token: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to automatically sign token: {str(e)}. Please contact administrator."
        )

    return token


@router.get("/blind-tokens/me/{election_id}", response_model=BlindTokenResponse)
async def get_my_blind_token(
    election_id: int,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    current_user: User = Depends(get_current_user),
):
    """Obtener el token cegado del usuario actual para una elección"""
    token = await token_repo.get_user_token(current_user.id, election_id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No blind token found for this election"
        )
    return token


@router.get("/blind-tokens/{token_id}/status", response_model=BlindTokenStatus)
async def get_token_status(
    token_id: int,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    current_user: User = Depends(get_current_user),
):
    """Verificar estado de un token cegado"""
    token = await token_repo.get(token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    # Solo el dueño o admin puede ver el estado
    if token.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    return BlindTokenStatus(
        id=token.id,
        is_signed=token.signed_token is not None,
        is_used=token.is_used,
        created_at=token.created_at,
    )


@router.get("/blind-tokens/pending", response_model=list[BlindTokenResponse])
async def get_pending_tokens(
    election_id: int = None,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    current_admin: User = Depends(get_current_admin),
):
    """Obtener tokens pendientes de firma (solo admin)"""
    tokens = await token_repo.get_pending_tokens(election_id)
    return tokens


@router.get("/blind-tokens/all", response_model=list[BlindTokenResponse])
async def get_all_tokens(
    election_id: int = None,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    current_admin: User = Depends(get_current_admin),
):
    """Obtener todos los tokens (solo admin)"""
    tokens = await token_repo.get_all_tokens(election_id)
    return tokens


@router.put("/blind-tokens/{token_id}/sign", response_model=BlindTokenResponse)
async def sign_blind_token(
    token_id: int,
    data: BlindTokenSign,
    token_repo: BlindTokenRepository = Depends(get_token_repo),
    current_admin: User = Depends(get_current_admin),
):
    """
    Firmar un token cegado (solo admin).
    La autoridad firma el token cegado sin conocer el contenido.
    """
    if token_id != data.blind_token_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token ID mismatch"
        )

    token = await token_repo.get(token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    if token.signed_token is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token already signed"
        )

    success = await token_repo.sign_token(token_id, data.signed_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sign token"
        )

    # Retornar token actualizado
    updated_token = await token_repo.get(token_id)
    return updated_token


# ============================================================================
# VOTE ENDPOINTS
# ============================================================================

@router.post("/votes/complete", response_model=VoteWithReceiptResponse, status_code=status.HTTP_201_CREATED)
async def cast_vote_with_receipt(
    data: VoteWithReceiptCreate,
    voting_service: VotingService = Depends(get_voting_service),
    current_user: User = Depends(get_current_user),
):
    """
    Emitir voto Y crear recibo en operación atómica.
    Esto garantiza que no haya estados inconsistentes.
    """
    # Verificar que el usuario sea el mismo
    if data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot vote for another user"
        )

    try:
        result = await voting_service.cast_vote_with_receipt(
            user_id=current_user.id,
            election_id=data.election_id,
            option_id=data.option_id,
            unblinded_signature=data.unblinded_signature,
            vote_hash=data.vote_hash,
            encrypted_vote=data.encrypted_vote,
            receipt_hash=data.receipt_hash,
            digital_signature=data.receipt_signature,
        )

        return VoteWithReceiptResponse(
            vote_id=result["vote"].id,
            election_id=result["vote"].election_id,
            receipt_id=result["receipt"].id,
            receipt_hash=result["receipt"].receipt_hash,
            voted_at=result["receipt"].voted_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/votes", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    data: VoteCreate,
    voting_service: VotingService = Depends(get_voting_service),
    current_user: User = Depends(get_current_user),
):
    """
    DEPRECATED: Use /votes/complete instead.
    Este endpoint solo crea el voto sin recibo, lo cual puede causar inconsistencias.
    Mantenido por compatibilidad.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use POST /voting/votes/complete for atomic vote + receipt"
    )


# ============================================================================
# VOTING RECEIPT ENDPOINTS
# ============================================================================

@router.post("/receipts", response_model=VotingReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_receipt(
    data: VotingReceiptCreate,
    voting_service: VotingService = Depends(get_voting_service),
    current_user: User = Depends(get_current_user),
):
    """
    Crear un recibo de votación.
    El recibo prueba que el usuario votó sin revelar su elección.
    """
    # Verificar que el usuario sea el mismo
    if data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create receipt for another user"
        )

    try:
        receipt = await voting_service.generate_receipt(
            user_id=data.user_id,
            election_id=data.election_id,
            receipt_hash=data.receipt_hash,
            digital_signature=data.digital_signature,
        )
        return receipt
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/receipts/me/{election_id}", response_model=VotingReceiptResponse)
async def get_my_receipt(
    election_id: int,
    receipt_repo: VotingReceiptRepository = Depends(get_receipt_repo),
    current_user: User = Depends(get_current_user),
):
    """Obtener el recibo de votación del usuario actual para una elección"""
    receipt = await receipt_repo.get_user_receipt(current_user.id, election_id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No voting receipt found for this election"
        )
    return receipt


@router.get("/has-voted/{election_id}")
async def check_if_voted(
    election_id: int,
    receipt_repo: VotingReceiptRepository = Depends(get_receipt_repo),
    current_user: User = Depends(get_current_user),
):
    """Verificar si el usuario actual ya votó en una elección"""
    has_voted = await receipt_repo.has_voted(current_user.id, election_id)
    return {"has_voted": has_voted, "election_id": election_id}
