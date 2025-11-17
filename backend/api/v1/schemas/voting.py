from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional
import re


# ============================================================================
# BLIND TOKEN SCHEMAS
# ============================================================================

class BlindTokenBase(BaseModel):
    """Esquema base para BlindToken"""
    blinded_token: str = Field(..., description="Token cegado por el usuario")
    
    @field_validator('blinded_token')
    @classmethod
    def validate_blinded_token(cls, v: str) -> str:
        """Valida que el token no esté vacío"""
        if not v.strip():
            raise ValueError('El token cegado no puede estar vacío')
        # Verificar que sea un string base64 válido (opcional)
        if len(v.strip()) < 10:
            raise ValueError('El token cegado parece ser demasiado corto')
        return v.strip()


class BlindTokenCreate(BlindTokenBase):
    """Esquema para crear un BlindToken"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    election_id: int = Field(..., gt=0, description="ID de la elección")


class BlindTokenSign(BaseModel):
    """Esquema para firmar un token ciego (solo admin)"""
    blind_token_id: int = Field(..., gt=0, description="ID del BlindToken a firmar")
    signed_token: str = Field(..., description="Token firmado por la autoridad")
    
    @field_validator('signed_token')
    @classmethod
    def validate_signed_token(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('El token firmado no puede estar vacío')
        if len(v.strip()) < 10:
            raise ValueError('El token firmado parece ser demasiado corto')
        return v.strip()


class BlindTokenResponse(BlindTokenBase):
    """Esquema para respuesta de BlindToken"""
    id: int
    user_id: int
    election_id: int
    signed_token: Optional[str] = None
    is_used: bool
    created_at: datetime
    used_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class BlindTokenStatus(BaseModel):
    """Esquema simple para verificar estado de token"""
    id: int
    is_signed: bool
    is_used: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# VOTE SCHEMAS
# ============================================================================

class VoteBase(BaseModel):
    """Esquema base para Vote"""
    election_id: int = Field(..., gt=0, description="ID de la elección")
    option_id: int = Field(..., gt=0, description="ID de la opción votada")
    encrypted_vote: str = Field(..., description="Voto encriptado")
    
    @field_validator('encrypted_vote')
    @classmethod
    def validate_encrypted_vote(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('El voto encriptado no puede estar vacío')
        if len(v.strip()) < 10:
            raise ValueError('El voto encriptado parece ser demasiado corto')
        return v.strip()


class VoteCreate(VoteBase):
    """Esquema para crear un voto anónimo"""
    unblinded_signature: str = Field(..., description="Firma descegada del token")
    vote_hash: str = Field(..., min_length=64, max_length=64, description="Hash SHA-256 del voto")

    @field_validator('unblinded_signature')
    @classmethod
    def validate_signature(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('La firma descegada no puede estar vacía')
        if len(v.strip()) < 10:
            raise ValueError('La firma descegada parece ser demasiado corta')
        return v.strip()

    @field_validator('vote_hash')
    @classmethod
    def validate_vote_hash(cls, v: str) -> str:
        """Valida que sea un hash SHA-256 válido (64 caracteres hexadecimales)"""
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('El hash del voto debe ser SHA-256 (64 caracteres hexadecimales)')
        return v.lower()


class VoteWithReceiptCreate(VoteCreate):
    """Esquema para crear voto Y recibo en operación atómica"""
    user_id: int = Field(..., gt=0, description="ID del usuario que vota")
    receipt_hash: str = Field(..., min_length=64, max_length=64, description="Hash SHA-256 del recibo")
    receipt_signature: str = Field(..., description="Firma digital del recibo")

    @field_validator('receipt_hash')
    @classmethod
    def validate_receipt_hash(cls, v: str) -> str:
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('El hash del recibo debe ser SHA-256 (64 caracteres hexadecimales)')
        return v.lower()

    @field_validator('receipt_signature')
    @classmethod
    def validate_receipt_signature(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('La firma del recibo no puede estar vacía')
        return v.strip()


class VoteWithReceiptResponse(BaseModel):
    """Respuesta de voto atómico con recibo"""
    vote_id: int
    election_id: int
    receipt_id: int
    receipt_hash: str
    voted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VoteResponse(BaseModel):
    """Esquema para respuesta de Vote (mínima información)"""
    id: int
    election_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VoteDetail(VoteResponse):
    """Esquema detallado de voto (solo para auditorías)"""
    option_id: int
    vote_hash: str
    unblinded_signature: str
    encrypted_vote: str
    
    model_config = ConfigDict(from_attributes=True)


class VoteVerification(BaseModel):
    """Esquema para verificar un voto"""
    vote_hash: str = Field(..., min_length=64, max_length=64)
    unblinded_signature: str
    
    @field_validator('vote_hash')
    @classmethod
    def validate_vote_hash(cls, v: str) -> str:
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('El hash del voto debe ser SHA-256 (64 caracteres hexadecimales)')
        return v.lower()


# ============================================================================
# VOTING RECEIPT SCHEMAS
# ============================================================================

class VotingReceiptBase(BaseModel):
    """Esquema base para VotingReceipt"""
    receipt_hash: str = Field(..., min_length=64, max_length=64, description="Hash SHA-256 del recibo")
    digital_signature: str = Field(..., description="Firma digital del recibo")
    
    @field_validator('receipt_hash')
    @classmethod
    def validate_receipt_hash(cls, v: str) -> str:
        """Valida que sea un hash SHA-256 válido"""
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('El hash del recibo debe ser SHA-256 (64 caracteres hexadecimales)')
        return v.lower()
    
    @field_validator('digital_signature')
    @classmethod
    def validate_signature(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('La firma digital no puede estar vacía')
        if len(v.strip()) < 10:
            raise ValueError('La firma digital parece ser demasiado corta')
        return v.strip()


class VotingReceiptCreate(VotingReceiptBase):
    """Esquema para crear un recibo de votación"""
    user_id: int = Field(..., gt=0, description="ID del usuario que votó")
    election_id: int = Field(..., gt=0, description="ID de la elección")


class VotingReceiptResponse(VotingReceiptBase):
    """Esquema para respuesta de VotingReceipt"""
    id: int
    user_id: int
    election_id: int
    voted_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class VotingReceiptVerification(BaseModel):
    """Esquema para verificar un recibo de votación"""
    receipt_hash: str = Field(..., min_length=64, max_length=64)
    digital_signature: str
    
    @field_validator('receipt_hash')
    @classmethod
    def validate_receipt_hash(cls, v: str) -> str:
        if not re.match(r'^[a-fA-F0-9]{64}$', v):
            raise ValueError('El hash del recibo debe ser SHA-256 (64 caracteres hexadecimales)')
        return v.lower()


# ============================================================================
# SCHEMAS DE ESTADÍSTICAS Y LISTADOS
# ============================================================================

class VoteStats(BaseModel):
    """Estadísticas de votación por elección"""
    election_id: int
    total_votes: int
    votes_by_option: dict[int, int]  # option_id: count


class BlindTokenList(BaseModel):
    """Lista de tokens ciegos con paginación"""
    tokens: list[BlindTokenResponse]
    total: int
    page: int
    page_size: int


class VoteList(BaseModel):
    """Lista de votos con paginación"""
    votes: list[VoteResponse]
    total: int
    page: int
    page_size: int


class VotingReceiptList(BaseModel):
    """Lista de recibos con paginación"""
    receipts: list[VotingReceiptResponse]
    total: int
    page: int
    page_size: int