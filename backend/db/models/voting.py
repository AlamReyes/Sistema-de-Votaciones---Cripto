from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from datetime import datetime
from db.base import Base


class BlindToken(Base):
    """
    Token ciego para votación anónima
    """
    __tablename__ = "blind_tokens"
    __table_args__ = (
        UniqueConstraint('user_id', 'election_id', name='uq_user_election_token'),
    )
    
    # ID autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Relaciones
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    election_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Datos de firma ciega (núcleo del sistema)
    blinded_token: Mapped[str] = mapped_column(Text, nullable=False)
    signed_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Control de uso
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="blind_tokens")
    election: Mapped["Election"] = relationship("Election", back_populates="blind_tokens")
    
    def __repr__(self):
        return f"<BlindToken(id={self.id}, user_id={self.user_id}, is_used={self.is_used})>"


class Vote(Base):
    """
    Votos anónimos - SIN user_id para garantizar anonimato
    """
    __tablename__ = "votes"
    
    # ID autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Relaciones (SIN user_id - anónimo)
    election_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    option_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("options.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Datos de seguridad
    unblinded_signature: Mapped[str] = mapped_column(Text, nullable=False)  # Firma descegada
    vote_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    encrypted_vote: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    election: Mapped["Election"] = relationship("Election", back_populates="votes")
    option: Mapped["Option"] = relationship("Option", back_populates="votes")
    
    def __repr__(self):
        return f"<Vote(id={self.id}, election_id={self.election_id}, anonymous=True)>"


class VotingReceipt(Base):
    """
    Recibo de votación para no repudio
    Prueba que el usuario votó sin revelar el voto
    """
    __tablename__ = "voting_receipts"
    __table_args__ = (
        UniqueConstraint('user_id', 'election_id', name='uq_user_election_receipt'),
    )
    
    # ID autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Relaciones
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    election_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Datos del recibo
    receipt_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    digital_signature: Mapped[str] = mapped_column(Text, nullable=False)
    
    voted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="voting_receipts")
    election: Mapped["Election"] = relationship("Election", back_populates="voting_receipts")
    
    def __repr__(self):
        return f"<VotingReceipt(id={self.id}, user_id={self.user_id}, election_id={self.election_id})>"