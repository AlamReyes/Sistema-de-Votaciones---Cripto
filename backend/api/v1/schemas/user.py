from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Esquema base con campos comunes"""
    name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    """Esquema para crear un usuario"""
    password: str = Field(..., min_length=8, max_length=128)
    is_admin: Optional[bool] = Field(default=False)

class UserUpdate(BaseModel):
    """Esquema para actualizar un usuario (todos los campos opcionales)"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=8, max_length=128)

class UserUpdateIsAdmin(BaseModel):
    """Esquema exclusivo para actualizar el atributo is_admin"""
    is_admin: bool

class UserUpdatePublicKey(BaseModel):
    """Esquema exclusivo para subir o actualizar la clave pública"""
    public_key: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    is_admin: bool

class RefreshResponse(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    """Esquema para respuestas (lo que se devuelve al cliente)"""
    id: int
    is_admin: bool
    created_at: datetime
    
    # Configuración para trabajar con modelos ORM
    model_config = ConfigDict(from_attributes=True)

class UserWithPublicKey(UserResponse):
    """Esquema que incluye la clave pública (para casos específicos)"""
    public_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserList(BaseModel):
    """Esquema para listar usuarios (paginación)"""
    users: list[UserResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)