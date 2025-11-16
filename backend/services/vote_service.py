# services/vote_service.py
from fastapi import HTTPException, status
from datetime import datetime, timezone
from crypto.voting_crypto import VotingCrypto
from db.repositories.voting import BlindTokenRepository, VoteRepository, VotingReceiptRepository

class VoteService:
    def __init__(self, db):
        self.db = db
        self.tokens = BlindTokenRepository(db)
        self.votes = VoteRepository(db)
        self.receipts = VotingReceiptRepository(db)

    async def submit_vote(
        self,
        user_id: int,
        election_id: int,
        option_id: int,
        unblinded_signature: str,
        user_private_key
    ):
        # Validar token del usuario
        token = await self.tokens.get_user_token(user_id, election_id)
        if not token:
            raise HTTPException(400, "Blind token not found")

        if token.is_used:
            raise HTTPException(400, "Blind token already used")

        # Preparar datos del voto
        timestamp = datetime.now(timezone.utc).isoformat()

        vote_hash = VotingCrypto.hash_vote(
            election_id=str(election_id),
            option_id=str(option_id),
            timestamp=timestamp
        )

        if await self.votes.vote_exists(vote_hash):
            raise HTTPException(400, "Duplicate vote hash detected")

        # Cifrado del voto
        vote_data = {
            "election_id": election_id,
            "option_id": option_id,
            "timestamp": timestamp,
            "vote_hash": vote_hash
        }

        encrypted_vote, aes_key = VotingCrypto.encrypt_vote(vote_data)

        # Registrar voto anónimo
        vote = await self.votes.cast_vote(
            election_id=election_id,
            option_id=option_id,
            unblinded_signature=unblinded_signature,
            vote_hash=vote_hash,
            encrypted_vote=encrypted_vote
        )

        # Marcar token como usado
        await self.tokens.mark_as_used(token.id)

        # Crear recibo para no repudio
        receipt_hash = VotingCrypto.hash_receipt(
            user_id=str(user_id),
            election_id=str(election_id),
            timestamp=timestamp
        )

        signature = VotingCrypto.sign_data(receipt_hash, user_private_key)

        receipt = await self.receipts.create_receipt(
            user_id=user_id,
            election_id=election_id,
            receipt_hash=receipt_hash,
            digital_signature=signature
        )

        return {
            "vote_id": vote.id,
            "vote_hash": vote_hash,
            "receipt": {
                "receipt_hash": receipt_hash,
                "signature": signature
            },
            "aes_key": aes_key  # esto normalmente va a los auditores, no al usuario
        }
