from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from db.repositories.voting import VoteRepository, VotingReceiptRepository, BlindTokenRepository
from db.repositories.election import ElectionRepository


class VotingService:
    def __init__(self, db: AsyncSession):
        self.votes = VoteRepository(db)
        self.receipts = VotingReceiptRepository(db)
        self.tokens = BlindTokenRepository(db)
        self.elections = ElectionRepository(db)

    async def cast_vote(
        self,
        user_id: int,
        election_id: int,
        option_id: int,
        unblinded_signature: str,
        vote_hash: str,
        encrypted_vote: str
    ):

        # 1. Verificar periodo de votación
        election = await self.elections.get(election_id)
        if not election:
            raise ValueError("Election not found")

        now = datetime.now(timezone.utc)
        if not (election.start_date <= now <= election.end_date):
            raise ValueError("Voting is closed")

        # 2. Verificar que usuario tenga un blind token firmado
        token = await self.tokens.get_user_token(user_id, election_id)
        if not token:
            raise ValueError("User does not have a blind token")

        if not token.signed_token:
            raise ValueError("Token is not signed")

        if token.is_used:
            raise ValueError("Token already used")

        # 3. Verificar que usuario no haya votado
        if await self.receipts.has_voted(user_id, election_id):
            raise ValueError("User already voted")

        # 4. Verificar duplicado de voto (hash)
        if await self.votes.vote_exists(vote_hash):
            raise ValueError("Duplicate vote detected")

        # 5. Registrar voto anónimo
        vote = await self.votes.cast_vote(
            election_id=election_id,
            option_id=option_id,
            unblinded_signature=unblinded_signature,
            vote_hash=vote_hash,
            encrypted_vote=encrypted_vote
        )

        # 6. Marcar token como usado
        await self.tokens.mark_as_used(token.id)

        return vote

    async def generate_receipt(self, user_id: int, election_id: int, receipt_hash: str, digital_signature: str):
        """Crea recibo que prueba que el usuario votó."""
        # Evitar duplicación
        if await self.receipts.has_voted(user_id, election_id):
            raise ValueError("Receipt already exists")

        return await self.receipts.create_receipt(
            user_id=user_id,
            election_id=election_id,
            receipt_hash=receipt_hash,
            digital_signature=digital_signature
        )
