from fastapi import HTTPException, status
from db.repositories.voting import VotingReceiptRepository

class VotingReceiptService:
    def __init__(self, db):
        self.repo = VotingReceiptRepository(db)

    async def get_receipt(self, user_id, election_id):
        receipt = await self.repo.get_user_receipt(user_id, election_id)
        if not receipt:
            raise HTTPException(404, "Receipt not found")
        return receipt
