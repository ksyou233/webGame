# 作用：封装 demo 后端的成绩写入与排行榜查询逻辑。
# 使用方法：由路由层调用，避免在控制器中堆叠 SQL 细节。
# 输入输出：输入为数据库会话与业务参数，输出为 ORM 实体列表。
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from . import models, schemas


def create_score(db: Session, payload: schemas.ScoreCreate) -> models.Score:
    """作用：写入一条成绩记录。

    使用方法：在 POST /scores 路由中调用。
    输入输出：输入为会话与已校验请求体；输出为插入后的成绩对象。
    """
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
    """作用：查询排行榜，每个玩家只保留最高成绩。

    使用方法：在 GET /scores/top 路由中调用。
    输入输出：输入为会话与条数限制；输出为按分数规则排序的成绩列表。
    """
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
