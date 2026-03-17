import os

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db

app = FastAPI(title="Web Game API", version="1.0.0")

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
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scores", response_model=schemas.ScoreOut)
def create_score(payload: schemas.ScoreCreate, db: Session = Depends(get_db)):
    return crud.create_score(db, payload)


@app.get("/scores/top", response_model=list[schemas.ScoreOut])
def get_top_scores(
    limit: int = Query(default=10, ge=1, le=100), db: Session = Depends(get_db)
):
    return crud.get_top_scores(db, limit)
