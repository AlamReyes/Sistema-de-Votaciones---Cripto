from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models.user import User
from db.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Obtener usuario por username"""
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def verify_credentials(self, username: str, password_hash: str) -> Optional[User]:
        """Verificar credenciales de usuario"""
        result = await self.db.execute(
            select(User).where(
                User.username == username,
                User.password_hash == password_hash
            )
        )
        return result.scalar_one_or_none()
    
    async def username_exists(self, username: str) -> bool:
        """Verificar si el username ya existe"""
        result = await self.db.execute(
            select(User.id).where(User.username == username)
        )
        return result.scalar_one_or_none() is not None
    
    async def create_user(self, username: str, password_hash: str, 
                         public_key: str) -> User:
        """Crear nuevo usuario"""
        if await self.username_exists(username):
            raise ValueError(f"Username '{username}' ya existe")
        
        return await self.create(
            username=username,
            password_hash=password_hash,
            public_key=public_key
        )