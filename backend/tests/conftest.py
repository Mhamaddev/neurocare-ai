"""Ensure isolated unit-test config when no local development .env exists."""
import os
from pathlib import Path

if not (Path(__file__).resolve().parents[2] / ".env").exists():
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://unused:unused@localhost/unused")
    os.environ.setdefault("SECRET_KEY", "test-only-secret-key-at-least-32-characters")


import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    """Limiter state is per process; tests must not inherit each other's request counts."""
    from app.core.rate_limit import limit_previews, limit_saved_predictions

    limit_previews.reset()
    limit_saved_predictions.reset()
