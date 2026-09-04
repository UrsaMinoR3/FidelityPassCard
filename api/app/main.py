from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.database import Base, engine
from .models import Group, GroupMember, Hangout, User  # noqa: F401 — registers models with Base metadata
from .routers import auth, groups

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Registro Salidas API",
    description="Backend for the Registro Salidas stamp-card app: accounts, groups, invite links, hangout logging.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # static frontend on GitHub Pages calls this API with a bearer token, no cookies involved
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(groups.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "version": "1.0.0"}
