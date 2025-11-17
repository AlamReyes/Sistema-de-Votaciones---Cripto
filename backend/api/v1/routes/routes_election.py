from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from core.deps import get_current_user, get_current_admin
from db.models.user import User
from db.models.election import Election, Option
from db.models.voting import Vote
from api.v1.schemas.election import (
    ElectionCreate,
    ElectionUpdate,
    ElectionResponse,
    ElectionWithOptions,
    ElectionResults,
    ElectionStatus,
    ElectionActivate,
    OptionWithVoteCount,
)
from db.session import get_db
from services.election_service import ElectionService
from crypto.voting_crypto import VotingCrypto
from datetime import datetime, timezone

router = APIRouter(prefix="/elections", tags=["Elections"])


def get_election_service(db: AsyncSession = Depends(get_db)) -> ElectionService:
    return ElectionService(db)


# ------------------------
# PUBLIC / USER ENDPOINTS
# ------------------------

@router.get("/active", response_model=list[ElectionWithOptions])
async def get_active_elections(
    service: ElectionService = Depends(get_election_service),
    current_user: User = Depends(get_current_user),
):
    """Get all currently active elections (within voting period)"""
    elections = await service.get_active_elections()
    return elections


@router.get("/{election_id}", response_model=ElectionWithOptions)
async def get_election(
    election_id: int,
    service: ElectionService = Depends(get_election_service),
    current_user: User = Depends(get_current_user),
):
    """Get a specific election with its options"""
    try:
        election = await service.get_election_with_options(election_id)
        return election
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{election_id}/status", response_model=ElectionStatus)
async def get_election_status(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if an election is currently open for voting"""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    now = datetime.now(timezone.utc)
    is_open = (
        election.is_active
        and election.start_date <= now
        and election.end_date >= now
    )

    return ElectionStatus(
        id=election.id,
        title=election.title,
        is_active=election.is_active,
        is_open=is_open,
        start_date=election.start_date,
        end_date=election.end_date,
    )


# ------------------------
# ADMIN ENDPOINTS
# ------------------------

@router.get("/", response_model=list[ElectionWithOptions])
async def list_all_elections(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List all elections (admin only)"""
    result = await db.execute(
        select(Election)
        .options(selectinload(Election.options))
        .order_by(Election.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=ElectionWithOptions, status_code=201)
async def create_election(
    data: ElectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create a new election with options (admin only)"""
    # Auto-generate blind signature key if not provided
    blind_signature_key = data.blind_signature_key
    if not blind_signature_key:
        # Generate RSA key pair for the institution
        private_key_pem, public_key_pem = VotingCrypto.generate_institution_keys()
        blind_signature_key = private_key_pem
        # Note: public_key_pem can be stored separately or derived from private key when needed

    # Create election
    election = Election(
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
        blind_signature_key=blind_signature_key,
    )
    db.add(election)
    await db.flush()  # Get the election ID

    # Create options
    for opt_data in data.options:
        option = Option(
            election_id=election.id,
            option_text=opt_data.option_text,
            option_order=opt_data.option_order,
        )
        db.add(option)

    await db.commit()

    # Reload with options
    result = await db.execute(
        select(Election)
        .options(selectinload(Election.options))
        .where(Election.id == election.id)
    )
    return result.scalar_one()


@router.put("/{election_id}", response_model=ElectionWithOptions)
async def update_election(
    election_id: int,
    data: ElectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Update an election (admin only)"""
    result = await db.execute(
        select(Election)
        .options(selectinload(Election.options))
        .where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Update fields that are provided
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(election, field, value)

    await db.commit()
    await db.refresh(election)

    return election


@router.delete("/{election_id}", status_code=204)
async def delete_election(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete an election (admin only)"""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    await db.delete(election)
    await db.commit()
    return None


@router.put("/{election_id}/activate", response_model=ElectionResponse)
async def toggle_election_active(
    election_id: int,
    data: ElectionActivate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Activate or deactivate an election (admin only)"""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    election.is_active = data.is_active
    await db.commit()
    await db.refresh(election)

    return election


@router.get("/{election_id}/results", response_model=ElectionResults)
async def get_election_results(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get vote counts for an election (admin only)"""
    # Get election with options
    result = await db.execute(
        select(Election)
        .options(selectinload(Election.options))
        .where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Count votes for each option
    options_with_counts = []
    total_votes = 0

    for option in sorted(election.options, key=lambda x: x.option_order):
        count_result = await db.execute(
            select(func.count(Vote.id)).where(Vote.option_id == option.id)
        )
        vote_count = count_result.scalar()
        total_votes += vote_count

        options_with_counts.append(
            OptionWithVoteCount(
                id=option.id,
                election_id=option.election_id,
                option_text=option.option_text,
                option_order=option.option_order,
                created_at=option.created_at,
                vote_count=vote_count,
            )
        )

    return ElectionResults(
        id=election.id,
        title=election.title,
        description=election.description,
        start_date=election.start_date,
        end_date=election.end_date,
        is_active=election.is_active,
        total_votes=total_votes,
        options=options_with_counts,
    )


@router.get("/{election_id}/public-key")
async def get_election_public_key(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get the institution's public key for an election (admin only)"""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    try:
        # Extract public key from stored private key
        public_key_pem = VotingCrypto.get_public_key_from_private(
            election.blind_signature_key
        )
        return {
            "election_id": election.id,
            "election_title": election.title,
            "public_key": public_key_pem,
            "key_type": "RSA-2048",
            "purpose": "Blind signature verification for anonymous voting"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting public key: {str(e)}"
        )


@router.put("/{election_id}/regenerate-key")
async def regenerate_election_key(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Regenerate RSA key pair for an election (admin only).
    Use this for elections created before automatic key generation.
    WARNING: This will invalidate any existing unsigned tokens.
    """
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check if election already has valid key
    has_valid_key = (
        election.blind_signature_key
        and election.blind_signature_key.startswith("-----BEGIN")
    )

    # Generate new RSA key pair
    private_key_pem, public_key_pem = VotingCrypto.generate_institution_keys()

    # Update election with new key
    election.blind_signature_key = private_key_pem
    await db.commit()
    await db.refresh(election)

    return {
        "election_id": election.id,
        "election_title": election.title,
        "message": "RSA key pair regenerated successfully",
        "had_valid_key_before": has_valid_key,
        "public_key": public_key_pem,
        "warning": "Any existing unsigned tokens will need to be recreated"
    }
