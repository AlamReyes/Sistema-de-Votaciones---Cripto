from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.models.user import User
from api.v1.schemas.user import (
    UserCreate, 
    UserUpdate, 
    UserUpdatePublicKey, 
    UserResponse,
    UserUpdateIsAdmin,
    UserWithPublicKey
)
from db.session import get_db
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)


# ------------------------
# AUTH (RUTA PROTEGIDA)
# ------------------------
@router.get("/me", response_model=UserWithPublicKey)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ------------------------
# CREATE (PÚBLICO)
# ------------------------
@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    service: UserService = Depends(get_user_service)
):
    return await service.create_user(data)


# ------------------------
# READ
# ------------------------
@router.get("/{username}")
async def check_username(username: str, service: UserService = Depends(get_user_service)):
    user = await service.get_user_by_username(username)
    return {"exists": user is not None}

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/", response_model=list[UserWithPublicKey])
async def list_users(
    skip: int = 0,
    limit: int = 10,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    return await service.list_users(skip, limit)


# ------------------------
# UPDATE
# ------------------------
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    user = await service.update_user(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}/public_key", response_model=UserWithPublicKey)
async def update_public_key(
    user_id: int,
    data: UserUpdatePublicKey,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    user = await service.update_user_public_key(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}/admin", response_model=UserResponse)
async def set_admin(
    user_id: int,
    data: UserUpdateIsAdmin,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    # OBLIGAR a que solo admins puedan usar este endpoint (opcional)
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = await service.update_user_is_admin(user_id, data.is_admin)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ------------------------
# DELETE
# ------------------------
@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user),  # PROTEGIDO
):
    deleted = await service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return None
