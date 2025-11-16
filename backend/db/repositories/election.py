from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime
from db.models.election import Election, Option
from db.repositories.base import BaseRepository

class ElectionRepository(BaseRepository[Election]):
    def __init__(self, db: AsyncSession):
        super().__init__(Election, db)
    
    async def get_with_options(self, election_id: int) -> Optional[Election]:
        """Obtener elección con sus opciones cargadas"""
        result = await self.db.execute(
            select(Election)
            .options(selectinload(Election.options))
            .where(Election.id == election_id)
        )
        return result.scalar_one_or_none()
    
    async def get_active_elections(self) -> List[Election]:
        """Obtener elecciones activas"""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Election)
            .options(selectinload(Election.options))
            .where(
                and_(
                    Election.is_active == True,
                    Election.start_date <= now,
                    Election.end_date >= now
                )
            )
            .order_by(Election.start_date)
        )
        return result.scalars().all()


class OptionRepository(BaseRepository[Option]):
    def __init__(self, db: AsyncSession):
        super().__init__(Option, db)
    
    async def get_by_election(self, election_id: int) -> List[Option]:
        """Obtener todas las opciones de una elección"""
        result = await self.db.execute(
            select(Option)
            .where(Option.election_id == election_id)
            .order_by(Option.option_order)
        )
        return result.scalars().all()
