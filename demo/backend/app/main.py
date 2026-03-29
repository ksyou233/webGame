# 作用：定义 demo 后端 HTTP 接口与应用生命周期。
# 使用方法：由 uvicorn app.main:app 启动。
# 输入输出：输入为 HTTP 请求，输出为健康状态或成绩数据。
import os

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db

# 作用：创建 FastAPI 应用实例，作为 API 入口。
app = FastAPI(title="Web Game Demo API", version="1.0.0")

# 作用：读取跨域来源白名单，支持逗号分隔多来源。
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """作用：服务启动时自动建表，保证 demo 首次运行可用。

    使用方法：由 FastAPI 生命周期自动触发。
    输入输出：无显式输入；输出为数据库中存在所需表结构。
    """
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    """作用：提供服务健康检查接口。

    使用方法：用于 docker 健康探测或手动连通性验证。
    输入输出：无输入；输出固定状态字典。
    """
    return {"status": "ok"}


@app.post("/scores", response_model=schemas.ScoreOut)
def create_score(payload: schemas.ScoreCreate, db: Session = Depends(get_db)):
    """作用：接收并保存玩家成绩。

    使用方法：前端在游戏结束时调用。
    输入输出：输入为成绩请求体；输出为数据库保存后的记录。
    """
    return crud.create_score(db, payload)


@app.get("/scores/top", response_model=list[schemas.ScoreOut])
def get_top_scores(
    limit: int = Query(default=10, ge=1, le=100), db: Session = Depends(get_db)
):
    """作用：返回排行榜数据。

    使用方法：前端页面加载和提交成功后刷新调用。
    输入输出：输入为可选 limit 参数；输出为成绩列表。
    """
    return crud.get_top_scores(db, limit)
