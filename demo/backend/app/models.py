# 作用：定义 demo 后端数据库表结构。
# 使用方法：由 SQLAlchemy 在启动时创建表并用于持久化查询。
# 输入输出：输入为业务写入数据，输出为数据库记录实体。
from sqlalchemy import Column, DateTime, Integer, String, func

from .database import Base


class Score(Base):
    """作用：保存玩家成绩记录。

    使用方法：由 CRUD 层创建与查询。
    输入输出：输入为玩家昵称、分数、存活时长；输出为持久化后的行对象。
    """

    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String(30), nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    survived_seconds = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
