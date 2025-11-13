from fastapi import APIRouter
from api.v1.routes_user import router as user_router

router = APIRouter()
router.include_router(user_router)

@router.get("/health")
async def health():
    return {"status": "ok"}
