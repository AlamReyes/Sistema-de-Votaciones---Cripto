from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.security import decode_token
from db.session import get_db
from db.models.user import User


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    # Read token from HTTP-only cookie
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    # Convertir a int porque el JWT guarda el ID como string
    user_id = int(user_id) if user_id else None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
