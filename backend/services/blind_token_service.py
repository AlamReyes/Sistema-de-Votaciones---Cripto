# services/blind_token_service.py
from fastapi import HTTPException, status
from crypto.voting_crypto import VotingCrypto
from db.repositories.voting import BlindTokenRepository

class BlindTokenService:
    def __init__(self, db):
        self.repo = BlindTokenRepository(db)

    async def request_blind_token(self, user_id: int, election_id: int, blinded_token: str):
        # Revisar si ya existe
        existing = await self.repo.get_user_token(user_id, election_id)
        if existing:
            raise HTTPException(400, "Blind token already generated")

        # Guardar token cegado
        token = await self.repo.create_blind_token(
            user_id=user_id,
            election_id=election_id,
            blinded_token=blinded_token
        )

        return token

    async def sign_blind_token(self, token_id: int, election_private_key):
        token = await self.repo.get(token_id)
        if not token:
            raise HTTPException(404, "Token not found")

        if token.signed_token:
            raise HTTPException(400, "Token already signed")

        # Firmar el token cegado
        signed = VotingCrypto.sign_data(token.blinded_token, election_private_key)

        await self.repo.sign_token(token_id, signed)
        return {"signed_token": signed}
