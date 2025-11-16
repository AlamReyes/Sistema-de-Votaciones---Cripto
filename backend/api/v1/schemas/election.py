from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from datetime import datetime
from typing import Optional, Self


# ============================================================================
# OPTION SCHEMAS
# ============================================================================

class OptionBase(BaseModel):
    """Esquema base para Option"""
    option_text: str = Field(..., min_length=1, max_length=300, description="Texto de la opción")
    option_order: int = Field(..., ge=1, description="Orden de la opción en la elección")
    
    @field_validator('option_text')
    @classmethod
    def validate_option_text(cls, v: str) -> str:
        """Valida que el texto de la opción no esté vacío"""
        if not v.strip():
            raise ValueError('El texto de la opción no puede estar vacío')
        return v.strip()


class OptionCreate(OptionBase):
    """Esquema para crear una opción (sin election_id, se asigna al crear elección)"""
    pass


class OptionUpdate(BaseModel):
    """Esquema para actualizar una opción"""
    option_text: Optional[str] = Field(None, min_length=1, max_length=300)
    option_order: Optional[int] = Field(None, ge=1)
    
    @field_validator('option_text')
    @classmethod
    def validate_option_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.strip():
            raise ValueError('El texto de la opción no puede estar vacío')
        return v.strip()


class OptionResponse(OptionBase):
    """Esquema para respuesta de Option"""
    id: int
    election_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class OptionWithVoteCount(OptionResponse):
    """Esquema de opción con conteo de votos (para resultados)"""
    vote_count: int = Field(default=0, description="Número de votos recibidos")


# ============================================================================
# ELECTION SCHEMAS
# ============================================================================

class ElectionBase(BaseModel):
    """Esquema base para Election"""
    title: str = Field(..., min_length=3, max_length=200, description="Título de la elección")
    description: Optional[str] = Field(None, description="Descripción de la elección")
    start_date: datetime = Field(..., description="Fecha de inicio de la votación")
    end_date: datetime = Field(..., description="Fecha de fin de la votación")
    is_active: bool = Field(default=True, description="Si la elección está activa")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Valida que el título no esté vacío"""
        if not v.strip():
            raise ValueError('El título no puede estar vacío')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Limpia espacios en la descripción"""
        if v is None:
            return v
        stripped = v.strip()
        return stripped if stripped else None
    
    @model_validator(mode='after')
    def validate_dates(self) -> Self:
        """Valida que la fecha de fin sea posterior a la de inicio"""
        if self.end_date <= self.start_date:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return self


class ElectionCreate(ElectionBase):
    """Esquema para crear una elección"""
    blind_signature_key: str = Field(..., description="Clave privada RSA para firma ciega (formato PEM)")
    options: list[OptionCreate] = Field(..., min_length=2, description="Lista de opciones (mínimo 2)")
    
    @field_validator('blind_signature_key')
    @classmethod
    def validate_signature_key(cls, v: str) -> str:
        """Valida formato básico de clave privada PEM"""
        if not v.strip():
            raise ValueError('La clave de firma ciega no puede estar vacía')
        
        v = v.strip()
        if not v.startswith('-----BEGIN'):
            raise ValueError('La clave debe estar en formato PEM')
        if not v.endswith('-----'):
            raise ValueError('Formato PEM inválido')
        
        return v
    
    @field_validator('options')
    @classmethod
    def validate_options(cls, v: list[OptionCreate]) -> list[OptionCreate]:
        """Valida que haya al menos 2 opciones y que no se repitan textos"""
        if len(v) < 2:
            raise ValueError('Una elección debe tener al menos 2 opciones')
        
        # Verificar que no haya textos duplicados
        texts = [opt.option_text.lower().strip() for opt in v]
        if len(texts) != len(set(texts)):
            raise ValueError('No puede haber opciones con el mismo texto')
        
        # Verificar que los órdenes no se repitan
        orders = [opt.option_order for opt in v]
        if len(orders) != len(set(orders)):
            raise ValueError('No puede haber opciones con el mismo orden')
        
        return v


class ElectionUpdate(BaseModel):
    """Esquema para actualizar una elección"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.strip():
            raise ValueError('El título no puede estar vacío')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        return stripped if stripped else None
    
    @model_validator(mode='after')
    def validate_dates(self) -> Self:
        """Valida fechas si ambas están presentes"""
        if self.start_date is not None and self.end_date is not None:
            if self.end_date <= self.start_date:
                raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return self


class ElectionResponse(ElectionBase):
    """Esquema para respuesta de Election (sin clave privada)"""
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ElectionWithOptions(ElectionResponse):
    """Esquema de elección con sus opciones"""
    options: list[OptionResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class ElectionDetail(ElectionWithOptions):
    """Esquema detallado de elección con estadísticas"""
    total_votes: int = Field(default=0, description="Total de votos emitidos")
    total_receipts: int = Field(default=0, description="Total de recibos emitidos")
    total_blind_tokens: int = Field(default=0, description="Total de tokens ciegos generados")


class ElectionResults(BaseModel):
    """Esquema para resultados de una elección"""
    id: int
    title: str
    description: Optional[str]
    start_date: datetime
    end_date: datetime
    is_active: bool
    total_votes: int
    options: list[OptionWithVoteCount]
    
    model_config = ConfigDict(from_attributes=True)


class ElectionStatus(BaseModel):
    """Esquema simple para verificar estado de elección"""
    id: int
    title: str
    is_active: bool
    is_open: bool = Field(description="Si está dentro del periodo de votación")
    start_date: datetime
    end_date: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE LISTADOS Y BÚSQUEDA
# ============================================================================

class ElectionList(BaseModel):
    """Lista de elecciones con paginación"""
    elections: list[ElectionResponse]
    total: int
    page: int
    page_size: int


class ElectionFilter(BaseModel):
    """Filtros para búsqueda de elecciones"""
    is_active: Optional[bool] = None
    is_open: Optional[bool] = Field(None, description="Filtrar por elecciones en periodo de votación")
    search: Optional[str] = Field(None, min_length=1, max_length=100, description="Buscar en título")
    
    @field_validator('search')
    @classmethod
    def validate_search(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        return stripped if stripped else None


# ============================================================================
# SCHEMAS PARA ADMINISTRACIÓN
# ============================================================================

class ElectionActivate(BaseModel):
    """Esquema para activar/desactivar elección"""
    is_active: bool = Field(..., description="Estado de activación")


class ElectionExtend(BaseModel):
    """Esquema para extender periodo de votación"""
    new_end_date: datetime = Field(..., description="Nueva fecha de fin")
    
    @field_validator('new_end_date')
    @classmethod
    def validate_future_date(cls, v: datetime) -> datetime:
        """Valida que la nueva fecha sea futura"""
        if v <= datetime.now(v.tzinfo):
            raise ValueError('La nueva fecha de fin debe ser futura')
        return v


class OptionList(BaseModel):
    """Lista de opciones"""
    options: list[OptionResponse]
    total: int