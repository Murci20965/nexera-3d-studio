import pytest
from starlette.testclient import TestClient


@pytest.fixture(autouse=True)
def set_tripo_api_key(monkeypatch):
    monkeypatch.setenv("TRIPO_API_KEY", "test-api-key")


@pytest.fixture
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c
