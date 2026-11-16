"""Serve the built frontend from the API process, for single-container deployments."""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def attach_frontend(app: FastAPI, directory: Path | None) -> None:
    """Add a catch-all that returns built files, or index.html for client-side routes."""
    if directory is None:
        return
    root = directory.resolve()
    index = root / "index.html"
    if not index.is_file():
        raise RuntimeError(f"FRONTEND_DIST has no index.html: {root}")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        target = (root / path).resolve()
        if path and target.is_relative_to(root) and target.is_file():
            # Vite fingerprints everything under assets/, so those files never change.
            cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
            return FileResponse(target, headers={"Cache-Control": cache})
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
