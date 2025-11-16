from sqlalchemy.ext.asyncio import AsyncSession
from db.models.user import User
from sqlalchemy.future import select
from api.v1.schemas.user import UserCreate, UserUpdate, UserUpdatePublicKey
from typing import Optional, List

# Al hacer el db.commit() es cuando se ejecutan realmente las consultas
# antes de eso solo se registar la acción a hacer, por eso no llevan await
# refresh hace el select para traer los datos actualizados
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ------------------------
    # CREATE
    # ------------------------
    async def create(self, data: UserCreate, password_hash: str) -> User:
        user = User(
            name=data.name,
            last_name=data.last_name,
            username=data.username,
            password_hash=password_hash,
            is_admin=False  # Siempre False para no verse afectado
        )
        self.db.add(user) # Sin await porque no toca la bd solo registra user en sesión
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ------------------------
    # READ
    # ------------------------
    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        # Si es un registro devuélvelo, si es 0 devuelve None, si son más devuelve error
        return result.scalar_one_or_none() 

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def list_users(self, skip: int = 0, limit: int = 10) -> List[User]:
        return await self.db.query(User).offset(skip).limit(limit).all()

    async def count_users(self) -> int:
        return await self.db.query(User).count()

    # ------------------------
    # UPDATE
    # ------------------------
    async def update(self, user: User, data: UserUpdate) -> User:
        for field, value in data.dict(exclude_unset=True).items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # Update only public key
    async def update_public_key(self, user: User, data: UserUpdatePublicKey) -> User:
        user.public_key = data.public_key
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # Update is_admin status
    async def update_is_admin(self, user: User, is_admin: bool) -> User:
        user.is_admin = is_admin
        await self.db.commit()
        await self.db.refresh(user)
        return user

    # ------------------------
    # DELETE
    # ------------------------
    async def delete(self, user: User) -> None:
        self.db.delete(user) # Solo lo marca como pendiente para ser eliminado
        await self.db.commit()
