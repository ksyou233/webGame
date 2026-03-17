from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from . import models, schemas


def create_score(db: Session, payload: schemas.ScoreCreate) -> models.Score:
    row = models.Score(
        player_name=payload.player_name,
        score=payload.score,
        survived_seconds=payload.survived_seconds,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_top_scores(db: Session, limit: int = 10) -> list[models.Score]:
    ranked = (
        db.query(
            models.Score.id.label("id"),
            func.row_number()
            .over(
                partition_by=models.Score.player_name,
                order_by=(
                    desc(models.Score.score),
                    desc(models.Score.survived_seconds),
                    desc(models.Score.created_at),
                ),
            )
            .label("rn"),
        )
        .subquery()
    )

    return (
        db.query(models.Score)
        .join(ranked, models.Score.id == ranked.c.id)
        .filter(ranked.c.rn == 1)
        .order_by(
            desc(models.Score.score),
            desc(models.Score.survived_seconds),
            desc(models.Score.created_at),
        )
        .limit(limit)
        .all()
    )
