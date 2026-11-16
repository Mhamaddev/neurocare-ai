"""Serving the built frontend from the API process."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.static_site import attach_frontend


@pytest.fixture
def client(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>NeuroCare</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('app')", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("outside the site", encoding="utf-8")
    app = FastAPI()
    attach_frontend(app, dist)
    return TestClient(app)


def test_serves_built_files_and_falls_back_to_the_app_for_client_routes(client):
    assert "NeuroCare" in client.get("/").text
    assert "NeuroCare" in client.get("/model").text
    script = client.get("/assets/app.js")
    assert script.text == "console.log('app')"
    assert "immutable" in script.headers["cache-control"]


def test_unknown_api_paths_stay_errors_and_files_outside_the_site_are_never_served(client):
    assert client.get("/api/v1/nothing").status_code == 404
    for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/assets/../../secret.txt"):
        assert "outside the site" not in client.get(path).text


def test_nothing_is_attached_without_a_directory_and_a_missing_build_fails_loudly(tmp_path):
    app = FastAPI()
    attach_frontend(app, None)
    assert TestClient(app).get("/").status_code == 404
    with pytest.raises(RuntimeError, match="index.html"):
        attach_frontend(FastAPI(), tmp_path)
