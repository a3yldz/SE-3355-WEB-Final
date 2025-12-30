# main FastAPI app entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import time

from app.routes import health, smoke, risk, fire_reports, fire_incidents, fire_stations

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=10)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Include routers
def include_routers(app: FastAPI):
    # Mevcut route'lar
    app.include_router(health.router)
    app.include_router(smoke.router)
    app.include_router(risk.router)
    # Yeni CRUD route'lar
    app.include_router(fire_reports.router)
    app.include_router(fire_incidents.router)
    app.include_router(fire_stations.router)

include_routers(app)
