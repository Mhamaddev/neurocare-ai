"""Request limiting on the model endpoints."""
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.routes.predictions import get_predictor
from app.core.rate_limit import RateLimit, limit_saved_predictions
from app.db.session import get_db
from app.main import app
from tests.fixtures import PAYLOAD


def request_from(host):
    return SimpleNamespace(client=SimpleNamespace(host=host))


def test_limit_is_per_client_and_the_window_slides():
    now = [0.0]
    limiter = RateLimit(limit=2, window_seconds=60, clock=lambda: now[0])
    limiter(request_from("a"))
    limiter(request_from("a"))
    with pytest.raises(HTTPException) as blocked:
        limiter(request_from("a"))
    assert blocked.value.status_code == 429 and int(blocked.value.headers["Retry-After"]) >= 1
    limiter(request_from("b"))
    now[0] = 61.0
    limiter(request_from("a"))


def test_flooding_saved_predictions_returns_429_without_writing():
    session, predictor = Mock(), Mock()
    session.refresh.side_effect = lambda record: setattr(record, "id", 1)
    predictor.threshold = 0.5
    predictor.predict.return_value = (1, 0.75, "test-model")
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_predictor] = lambda: predictor
    try:
        client = TestClient(app)
        for _ in range(limit_saved_predictions.limit):
            assert client.post("/api/v1/predictions", json=PAYLOAD).status_code == 201
        response = client.post("/api/v1/predictions", json=PAYLOAD)
        assert response.status_code == 429 and "Retry-After" in response.headers
        assert session.commit.call_count == limit_saved_predictions.limit
    finally:
        app.dependency_overrides.clear()
