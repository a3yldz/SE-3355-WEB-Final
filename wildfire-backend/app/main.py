# main FastAPI app entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import time

from app.routes import health, smoke, risk, auth, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=10)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Include routers
def include_routers(app: FastAPI):
    app.include_router(health.router)
    app.include_router(smoke.router)
    app.include_router(risk.router)
    app.include_router(auth.router)
    app.include_router(admin.router)

include_routers(app)
