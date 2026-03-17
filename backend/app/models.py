from sqlalchemy import Column, DateTime, Integer, String, func

from .database import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String(30), nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    survived_seconds = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
