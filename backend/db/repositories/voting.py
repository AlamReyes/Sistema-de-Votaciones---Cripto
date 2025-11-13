from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from db.models.voting import BlindToken, Vote, VotingReceipt
from db.repositories.base import BaseRepository


class BlindTokenRepository(BaseRepository[BlindToken]):
    """Repositorio para tokens ciegos - NÚCLEO DEL SISTEMA"""
    
    def __init__(self, db: AsyncSession):
        super().__init__(BlindToken, db)
    
    async def get_user_token(self, user_id: int, election_id: int) -> Optional[BlindToken]:
        """Obtener token de un usuario para una elección"""
        result = await self.db.execute(
            select(BlindToken).where(
                and_(
                    BlindToken.user_id == user_id,
                    BlindToken.election_id == election_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create_blind_token(self, user_id: int, election_id: int,
                                blinded_token: str) -> BlindToken:
        """Crear token cegado"""
        return await self.create(
            user_id=user_id,
            election_id=election_id,
            blinded_token=blinded_token
        )
    
    async def sign_token(self, token_id: int, signed_token: str) -> bool:
        """Actualizar token con firma ciega"""
        token = await self.get(token_id)
        if not token or token.signed_token is not None:
            return False
        
        await self.update(token_id, signed_token=signed_token)
        return True
    
    async def mark_as_used(self, token_id: int) -> bool:
        """Marcar token como usado"""
        from datetime import datetime
        token = await self.get(token_id)
        if not token or token.is_used:
            return False
        
        await self.update(token_id, is_used=True, used_at=datetime.utcnow())
        return True


class VoteRepository(BaseRepository[Vote]):
    def __init__(self, db: AsyncSession):
        super().__init__(Vote, db)
    
    async def cast_vote(self, election_id: int, option_id: int,
                       unblinded_signature: str, vote_hash: str,
                       encrypted_vote: str) -> Vote:
        """Registrar voto anónimo"""
        return await self.create(
            election_id=election_id,
            option_id=option_id,
            unblinded_signature=unblinded_signature,
            vote_hash=vote_hash,
            encrypted_vote=encrypted_vote
        )
    
    async def get_election_results(self, election_id: int) -> List[dict]:
        """Obtener resultados de una elección"""
        result = await self.db.execute(
            select(
                Vote.option_id,
                func.count(Vote.id).label('vote_count')
            )
            .where(Vote.election_id == election_id)
            .group_by(Vote.option_id)
        )
        return [{"option_id": row[0], "vote_count": row[1]} for row in result.all()]
    
    async def vote_exists(self, vote_hash: str) -> bool:
        """Verificar si ya existe un voto con ese hash"""
        result = await self.db.execute(
            select(Vote.id).where(Vote.vote_hash == vote_hash)
        )
        return result.scalar_one_or_none() is not None


class VotingReceiptRepository(BaseRepository[VotingReceipt]):
    def __init__(self, db: AsyncSession):
        super().__init__(VotingReceipt, db)
    
    async def create_receipt(self, user_id: int, election_id: int,
                            receipt_hash: str, digital_signature: str) -> VotingReceipt:
        """Crear recibo de votación"""
        return await self.create(
            user_id=user_id,
            election_id=election_id,
            receipt_hash=receipt_hash,
            digital_signature=digital_signature
        )
    
    async def has_voted(self, user_id: int, election_id: int) -> bool:
        """Verificar si el usuario ya votó"""
        result = await self.db.execute(
            select(VotingReceipt.id).where(
                and_(
                    VotingReceipt.user_id == user_id,
                    VotingReceipt.election_id == election_id
                )
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def get_user_receipt(self, user_id: int, 
                              election_id: int) -> Optional[VotingReceipt]:
        """Obtener recibo de un usuario"""
        result = await self.db.execute(
            select(VotingReceipt).where(
                and_(
                    VotingReceipt.user_id == user_id,
                    VotingReceipt.election_id == election_id
                )
            )
        )
        return result.scalar_one_or_none()