from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from db.repositories.user import UserRepository

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register")
async def register_user(
    username: str, password: str,
    session: AsyncSession = Depends(get_db)
):
    user_repo = UserRepository(session)

    user = await user_repo.create_user(
        username=username,
        password_hash = password,  # implementar función hash
        public_key="mi_llave_publica"
    )
    return user

@router.delete("/users/{id}")
async def delete_user(id: int, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    deleted = await repo.delete(id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario eliminado correctamente"}