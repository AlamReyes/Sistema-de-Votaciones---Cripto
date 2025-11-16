from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from db.session import get_db
from db.repositories.user import UserRepository
from api.v1.schemas.user import LoginResponse
from crypto.voting_crypto import VotingCrypto
from core.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# --------------------------
# LOGIN Y CREACIÓN DE TOKENS
# --------------------------
@router.post("/login", response_model=LoginResponse)
async def login(
    response: Response, # Permite settear cookies
    form_data: OAuth2PasswordRequestForm = Depends(), # Contiene username y password
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db) # Obtiene el repository que habla con la bd
    user = await repo.get_by_username(form_data.username.lower()) # Busca al usuario por username utilizando un service

    if not user or not VotingCrypto.verify_password(form_data.password, user.password_hash): # Valida usuario
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    # Generar tokens
    # Token de vida corta para hacer peticiones a endpoints protegidos (si te lo roban dura poco)
    access_token = create_access_token({"sub": str(user.id), "is_admin": bool(user.is_admin)})
    # Token de vida larga, no se usa para acceder a recursos, solo para pedir otro token (evitar inicio de sesión regularmente)
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # Guarda tokens en cookies HTTPOnly evita vulnerabilidad a XSS (inyección de JS malicioso)
    response.set_cookie("access_token", access_token, httponly=True, secure=False)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False)

    # EN PRODUCCIÓN DEJAR SOLO is_admin EN EL RETURN
    # Devuelve datos (deben coincidir con LoginResponse)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "is_admin": user.is_admin
    }

# ------------------------
# REFRESH TOKEN
# ------------------------
@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db) # Obtiene el repository que habla con la bd
    refresh_token = request.cookies.get("refresh_token") # Lee la cookie desde el request

    # Validar si existe el refresh token
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    # Decodificar y validar el tipo
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["sub"]
    user = await repo.get_user_by_id(user_id) 

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Crear nuevo access token
    new_access = create_access_token({"sub": str(user.id)})

    # Guardarlo como cookie
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=False,    # Cambia a True en producción
        samesite="lax"
    )

    return {
        "access_token": new_access,
        "token_type": "bearer"
    }


# ------------------------
# LOGOUT
# ------------------------
@router.post("/logout")
def logout(response: Response):
    # Eliminar tokens
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

