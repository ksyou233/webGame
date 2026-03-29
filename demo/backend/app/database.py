# 作用：集中管理 demo 后端数据库连接、会话工厂与依赖注入。
# 使用方法：业务层通过 get_db() 获取会话，模型层继承 Base。
# 输入输出：输入为环境变量，输出为 SQLAlchemy Engine 与 Session。
import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 作用：读取数据库连接参数，默认值用于本地 demo 快速启动。
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "webgame_demo")
DB_USER = os.getenv("DB_USER", "webgame_demo")
DB_PASSWORD = os.getenv("DB_PASSWORD", "webgame_demo")

# 作用：拼装 PostgreSQL 连接串，供 SQLAlchemy 创建引擎。
DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# 作用：创建数据库引擎并开启心跳检测，减少连接失效问题。
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 作用：创建会话工厂，供每个请求独立使用数据库会话。
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 作用：ORM 模型基类，所有表模型应继承该基类。
Base = declarative_base()


def get_db() -> Generator:
    """作用：为 FastAPI 请求提供数据库会话依赖。

    使用方法：在路由函数中通过 Depends(get_db) 注入。
    输入输出：无显式输入；输出为可用的 Session，并在请求结束后自动关闭。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
