from sqlalchemy.ext.asyncio import AsyncSession
from db.repositories.voting import BlindTokenRepository


class TokenService:
    def __init__(self, db: AsyncSession):
        self.tokens = BlindTokenRepository(db)

    async def request_blind_token(self, user_id: int, election_id: int, blinded_token: str):
        """Crea un token cegado si no existe."""
        existing = await self.tokens.get_user_token(user_id, election_id)
        if existing:
            raise ValueError("User already has a blind token for this election")
        
        return await self.tokens.create_blind_token(
            user_id=user_id,
            election_id=election_id,
            blinded_token=blinded_token
        )

    async def sign_token(self, token_id: int, signed_token: str):
        """Firma ciega aplicada por la autoridad."""
        success = await self.tokens.sign_token(token_id, signed_token)
        if not success:
            raise ValueError("Token not found or already signed")
        return True

    async def mark_token_used(self, token_id: int):
        """Marca que ya se usó para votar."""
        success = await self.tokens.mark_as_used(token_id)
        if not success:
            raise ValueError("Token not found or already used")
        return True
