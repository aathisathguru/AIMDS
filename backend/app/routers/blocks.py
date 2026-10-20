"""Blocks and floors."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_user
from app.schemas import BlockCreate
from app.services.estate import store as estate

router = APIRouter(prefix="/blocks", tags=["blocks"], dependencies=[Depends(require_user)])


@router.get("", summary="Every monitored block")
def list_blocks() -> list[dict]:
    return estate.list_blocks()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Provision a block")
def create_block(payload: BlockCreate) -> dict:
    if estate.get_block(payload.code):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Block {payload.code.upper()} already exists",
        )
    return estate.create_block(payload.model_dump())


@router.get("/{code}", summary="One block with its floors")
def get_block(code: str) -> dict:
    block = estate.get_block(code)
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Block {code} not found")
    return block


@router.get("/{code}/floors/{floor_code}", summary="One floor")
def get_floor(code: str, floor_code: str) -> dict:
    floor = estate.get_floor(code, floor_code)
    if floor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Floor {code}/{floor_code} not found")
    return floor
