from unittest.mock import AsyncMock, patch

import httpx
import respx


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ── Text generation ──────────────────────────────────────────────────────────

def test_generate_text_empty_prompt(client):
    response = client.post("/api/generate/text", json={"prompt": "   "})
    assert response.status_code == 422


def test_generate_text_success(client):
    with patch("app.api.routes.generate.create_text_task", new=AsyncMock(return_value="task-123")):
        response = client.post("/api/generate/text", json={"prompt": "a dragon"})
    assert response.status_code == 200
    assert response.json() == {"task_id": "task-123"}


def test_generate_text_low_poly(client):
    with patch("app.api.routes.generate.create_text_task", new=AsyncMock(return_value="task-lp")) as mock:
        response = client.post(
            "/api/generate/text",
            json={"prompt": "a cube", "quality": "balanced", "low_poly": True},
        )
    assert response.status_code == 200
    mock.assert_awaited_once_with(prompt="a cube", low_poly=True, quad_remesh=False)


# ── Image generation ─────────────────────────────────────────────────────────

def test_generate_image_empty_file(client):
    response = client.post(
        "/api/generate/image",
        files={"file": ("test.png", b"", "image/png")},
    )
    assert response.status_code == 422


def test_generate_image_oversized(client):
    oversized = b"x" * (20 * 1024 * 1024 + 1)
    response = client.post(
        "/api/generate/image",
        files={"file": ("big.png", oversized, "image/png")},
    )
    assert response.status_code == 413
    assert "20 MB" in response.json()["detail"]


def test_generate_image_success(client):
    with (
        patch("app.api.routes.generate.upload_image", new=AsyncMock(return_value="img-token")),
        patch("app.api.routes.generate.create_image_task", new=AsyncMock(return_value="task-456")),
    ):
        response = client.post(
            "/api/generate/image",
            files={"file": ("photo.jpg", b"fakeimagedata", "image/jpeg")},
        )
    assert response.status_code == 200
    assert response.json() == {"task_id": "task-456"}


# ── Task polling ─────────────────────────────────────────────────────────────

def test_poll_task_success(client):
    with patch(
        "app.api.routes.generate.get_task_status",
        new=AsyncMock(return_value={"status": "success", "progress": 100, "model_url": "https://cdn.tripo3d.ai/m.glb"}),
    ):
        response = client.get("/api/task/task-123")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["progress"] == 100
    assert data["model_url"] == "https://cdn.tripo3d.ai/m.glb"


def test_poll_task_processing(client):
    with patch(
        "app.api.routes.generate.get_task_status",
        new=AsyncMock(return_value={"status": "processing", "progress": 42, "model_url": None}),
    ):
        response = client.get("/api/task/task-abc")
    assert response.status_code == 200
    assert response.json()["status"] == "processing"


# ── Proxy ────────────────────────────────────────────────────────────────────

def test_proxy_model_invalid_scheme(client):
    response = client.get("/api/proxy-model", params={"url": "http://evil.com/model.glb"})
    assert response.status_code == 400


def test_proxy_model_missing_url(client):
    response = client.get("/api/proxy-model")
    assert response.status_code == 422


@respx.mock
def test_proxy_model_streams_glb(client):
    target = "https://cdn.tripo3d.ai/model.glb"
    respx.get(target).mock(return_value=httpx.Response(200, content=b"GLBDATA"))
    response = client.get("/api/proxy-model", params={"url": target})
    assert response.status_code == 200
    assert response.content == b"GLBDATA"
