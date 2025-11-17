from fastapi import APIRouter
from api.v1.routes.routes_user import router as user_router
from api.v1.routes.auth import router as auth_router
from api.v1.routes.routes_voting import router as voting_router
from api.v1.routes.routes_election import router as election_router

router = APIRouter()
router.include_router(user_router)
router.include_router(auth_router)
router.include_router(voting_router)
router.include_router(election_router)

@router.get("/health")
async def health():
    return {"status": "ok"}
