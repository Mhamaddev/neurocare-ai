"""Explanation, what-if preview and curve endpoints; no database writes, no real model."""
import json
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.api.routes import predictions as routes
from app.api.routes.predictions import get_predictor
from app.db.session import get_db
from app.main import app
from app.ml.curves import sweep
from app.ml.data import FEATURES, Preprocessor
from app.ml.inference import Predictor
from tests.fixtures import PAYLOAD


class LinearModel:
    """Sigmoid of a weighted sum: a stand-in with known per-feature behaviour."""
    def __init__(self, weights):
        self.weights = np.asarray(weights, dtype="float32")

    def __call__(self, batch):
        return (1 / (1 + np.exp(-(batch @ self.weights))))[:, None]


def stub_predictor(weights):
    predictor = Predictor.__new__(Predictor)
    predictor.preprocessing = Preprocessor([0.0] * len(FEATURES), [1.0] * len(FEATURES))
    predictor._forward, predictor.threshold, predictor.version = LinearModel(weights), 0.5, "stub"
    return predictor


def test_effects_follow_the_sign_of_each_answer_and_ignore_unused_inputs():
    weights = [0.0] * len(FEATURES)
    weights[FEATURES.index("BMI")], weights[FEATURES.index("Age")] = 0.05, -0.2
    score, effects = stub_predictor(weights).explain(PAYLOAD)
    by_name = {item["name"]: item["effect"] for item in effects}
    assert [item["name"] for item in effects] == list(FEATURES)
    assert score == pytest.approx(stub_predictor(weights).predict(PAYLOAD)[1])
    assert by_name["BMI"] > 0 > by_name["Age"]
    assert all(value == 0 for name, value in by_name.items() if name not in ("BMI", "Age"))


@pytest.fixture
def client():
    session, predictor = Mock(), Mock()
    predictor.threshold, predictor.version = 0.5, "test-model"
    predictor.explain.return_value = (0.75, [{"name": name, "effect": 0.01} for name in FEATURES])
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_predictor] = lambda: predictor
    yield TestClient(app), session, predictor
    app.dependency_overrides.clear()


def test_preview_scores_without_touching_the_database(client):
    http, session, predictor = client
    response = http.post("/api/v1/predictions/preview", json=PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["predicted_class"] == 1 and body["predicted_probability"] == 0.75
    assert len(body["effects"]) == len(FEATURES) and "id" not in body
    session.add.assert_not_called()
    session.commit.assert_not_called()


def test_preview_uses_the_same_strict_validation(client):
    http, _, predictor = client
    assert http.post("/api/v1/predictions/preview", json={**PAYLOAD, "BMI": 500}).status_code == 422
    predictor.explain.assert_not_called()


def test_saved_prediction_includes_effects_and_survives_an_explanation_failure(client):
    http, session, predictor = client
    session.refresh.side_effect = lambda record: setattr(record, "id", 3)
    predictor.predict.return_value = (1, 0.75, "test-model")
    assert len(http.post("/api/v1/predictions", json=PAYLOAD).json()["effects"]) == len(FEATURES)
    predictor.explain.side_effect = RuntimeError("explanation failed")
    response = http.post("/api/v1/predictions", json=PAYLOAD)
    assert response.status_code == 201 and response.json()["effects"] == []


def test_curves_are_served_only_for_the_configured_model_version(client, tmp_path, monkeypatch):
    http, _, _ = client
    monkeypatch.setattr(routes, "get_settings", lambda: SimpleNamespace(model_dir=tmp_path))
    assert http.get("/api/v1/model/curves").status_code == 404
    (tmp_path / "curves.json").write_text(json.dumps({"version": "another-model"}))
    assert http.get("/api/v1/model/curves").status_code == 404
    (tmp_path / "curves.json").write_text(json.dumps({"version": "test-model", "models": {}}))
    assert http.get("/api/v1/model/curves").json()["version"] == "test-model"


def test_sweep_counts_match_a_direct_count_at_every_threshold():
    labels = np.array([0, 0, 1, 0, 1, 1, 0, 1])
    scores = np.array([0.1, 0.2, 0.2, 0.4, 0.5, 0.7, 0.8, 0.9])
    rows = sweep(labels, scores, [0.45])
    assert [row[0] for row in rows] == sorted({row[0] for row in rows}) and 0.45 in [row[0] for row in rows]
    for threshold, true_positive, false_positive in rows:
        flagged = scores >= threshold
        assert true_positive == int((flagged & (labels == 1)).sum())
        assert false_positive == int((flagged & (labels == 0)).sum())
