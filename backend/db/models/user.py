from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from db.base import Base


class User(Base):
    """
    Usuario del sistema de votación
    """
    __tablename__ = "users"
    
    # ID autoincremental simple
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Datos básicos
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    public_key: Mapped[str] = mapped_column(String, nullable=False)  # RSA PEM
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    blind_tokens: Mapped[list["BlindToken"]] = relationship(
        "BlindToken", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    voting_receipts: Mapped[list["VotingReceipt"]] = relationship(
        "VotingReceipt", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"