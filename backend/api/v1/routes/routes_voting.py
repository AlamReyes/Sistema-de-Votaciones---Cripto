from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_current_admin
from db.models.user import User
from db.session import get_db
from db.repositories.voting import BlindTokenRepository, VotingReceiptRepository
from db.repositories.election import ElectionRepository
from services.voting_service import VotingService
from services.election_service import ElectionService
from api.v1.schemas.voting import (
    BlindTokenCreate,
    BlindTokenResponse,
    BlindTokenSign,
    BlindTokenStatus,
    VoteCreate,
    VoteResponse,
    VotingReceiptCreate,
    VotingReceiptResponse,
)

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
    election_service: ElectionService = Depends(get_election_service),
    current_user: User = Depends(get_current_user),
):
    """
    Crear un token cegado para una elección.
    El usuario envía su token cegado para que la autoridad lo firme.
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

    # Crear el token cegado
    token = await token_repo.create_blind_token(
        user_id=data.user_id,
        election_id=data.election_id,
        blinded_token=data.blinded_token,
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

@router.post("/votes", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def cast_vote(
    data: VoteCreate,
    voting_service: VotingService = Depends(get_voting_service),
    current_user: User = Depends(get_current_user),
):
    """
    Emitir un voto anónimo.
    Requiere:
    - Token cegado firmado y no usado
    - Firma descegada válida
    - Hash único del voto
    - Voto encriptado
    """
    try:
        vote = await voting_service.cast_vote(
            user_id=current_user.id,
            election_id=data.election_id,
            option_id=data.option_id,
            unblinded_signature=data.unblinded_signature,
            vote_hash=data.vote_hash,
            encrypted_vote=data.encrypted_vote,
        )
        return vote
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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
