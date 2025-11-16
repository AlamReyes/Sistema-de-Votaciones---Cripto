from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from db.repositories.election import ElectionRepository, OptionRepository

class ElectionService:
    def __init__(self, db: AsyncSession):
        self.elections = ElectionRepository(db)
        self.options = OptionRepository(db)

    async def get_active_elections(self):
        """Retorna todas las elecciones activas actualmente."""
        return await self.elections.get_active_elections()
    
    async def get_election_with_options(self, election_id: int):
        """Devuelve elección con opciones asociadas."""
        election = await self.elections.get_with_options(election_id)
        if not election:
            raise ValueError("Election not found")
        return election

    async def is_voting_open(self, election_id: int) -> bool:
        """Verifica si una elección está en curso."""
        election = await self.elections.get(election_id)
        if not election:
            return False
        
        now = datetime.now(timezone.utc)
        return (
            election.is_active
            and election.start_date <= now
            and election.end_date >= now
        )
