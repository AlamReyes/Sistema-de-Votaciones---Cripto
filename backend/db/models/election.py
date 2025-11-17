from sqlalchemy import CheckConstraint, String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from db.base import Base


class Election(Base):
    """
    Elección precargada en el sistema
    """
    __tablename__ = "elections"

    # ID autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Información de la elección
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Periodo de votación
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    # Clave de la autoridad para firma ciega
    blind_signature_key: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    # Relaciones
    # Una elección tiene muchas opciones
    options: Mapped[list["Option"]] = relationship(
        "Option", 
        back_populates="election",
        cascade="all, delete-orphan"
    )
    # Una elección tiene muchas firmas ciegas
    blind_tokens: Mapped[list["BlindToken"]] = relationship(
        "BlindToken", 
        back_populates="election",
        cascade="all, delete-orphan"
    )
    # Una eleccion tiene muchos votos
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", 
        back_populates="election",
        cascade="all, delete-orphan"
    )
    # Una eleccion tiene muchos recibos de votación
    voting_receipts: Mapped[list["VotingReceipt"]] = relationship(
        "VotingReceipt", 
        back_populates="election",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Election(id={self.id}, title='{self.title}')>"


class Option(Base):
    """
    Opciones de votación para cada elección
    """
    __tablename__ = "options"
    
    # ID autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign Key
    election_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("elections.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Datos de la opción
    option_text: Mapped[str] = mapped_column(String(300), nullable=False)
    option_order: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    # Relaciones
    # Una opcion pertenece a una elección específica
    election: Mapped["Election"] = relationship("Election", back_populates="options")
    # Una opción tiene muchos votos
    votes: Mapped[list["Vote"]] = relationship("Vote", back_populates="option")
    
    def __repr__(self):
        return f"<Option(id={self.id}, text='{self.option_text}')>"