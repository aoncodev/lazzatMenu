from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.db import engine, Base
from app import models  # noqa: F401 - ensure models registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Lazzat Menu Calculator", lifespan=lifespan)

from app.routers import ingredients, menu  # noqa: E402
app.include_router(ingredients.router)
app.include_router(menu.router)


@app.get("/api/health")
def health():
    return {"ok": True}


static_dir = Path(__file__).parent / "static"

if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
