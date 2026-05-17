import asyncio
import sys

# Windows ProactorEventLoop has a getaddrinfo bug — force SelectorEventLoop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.config.settings import *  # noqa: F401,F403

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.generate import router as generate_router

app = FastAPI(
    title="Nexera 3D Studio API",
    description="Generate 3D models from text or images using the Tripo3D API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
