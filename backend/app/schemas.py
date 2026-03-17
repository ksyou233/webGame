from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ScoreCreate(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=30)
    score: int = Field(..., ge=0, le=1000000)
    survived_seconds: int = Field(..., ge=0, le=86400)

    @field_validator("player_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class ScoreOut(BaseModel):
    id: int
    player_name: str
    score: int
    survived_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True
