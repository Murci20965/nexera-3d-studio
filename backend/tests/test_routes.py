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


# ── Multiview generation ─────────────────────────────────────────────────────


def _mv_files(front=b"f", back=b"b", left=b"l", right=b"r"):
    return {
        "front": ("front.png", front, "image/png"),
        "back":  ("back.png",  back,  "image/png"),
        "left":  ("left.png",  left,  "image/png"),
        "right": ("right.png", right, "image/png"),
    }


def test_generate_multiview_missing_view(client):
    # Drop one required view
    files = _mv_files()
    files.pop("back")
    response = client.post("/api/generate/multiview", files=files)
    assert response.status_code == 422


def test_generate_multiview_empty_view(client):
    response = client.post(
        "/api/generate/multiview",
        files=_mv_files(back=b""),
    )
    assert response.status_code == 422
    assert "back" in response.json()["detail"]


def test_generate_multiview_oversized_view(client):
    oversized = b"x" * (20 * 1024 * 1024 + 1)
    response = client.post(
        "/api/generate/multiview",
        files=_mv_files(left=oversized),
    )
    assert response.status_code == 413
    assert "left" in response.json()["detail"]


def test_generate_multiview_success(client):
    with (
        patch(
            "app.api.routes.generate.upload_image",
            new=AsyncMock(side_effect=["t-front", "t-back", "t-left", "t-right"]),
        ),
        patch(
            "app.api.routes.generate.create_multiview_task",
            new=AsyncMock(return_value="task-mv"),
        ) as create_mock,
    ):
        response = client.post(
            "/api/generate/multiview",
            files=_mv_files(),
            data={"prompt": "a wooden chair"},
        )

    assert response.status_code == 200
    assert response.json() == {"task_id": "task-mv"}

    # Verify the service was called with tokens in the correct fixed order
    create_mock.assert_awaited_once()
    kwargs = create_mock.await_args.kwargs
    tokens = [f["file_token"] for f in kwargs["files"]]
    assert tokens == ["t-front", "t-back", "t-left", "t-right"]
    assert kwargs["prompt"] == "a wooden chair"
    # Default quality is standard when client omits the field
    assert kwargs["geometry_quality"] == "standard"


def test_generate_multiview_detailed_quality(client):
    with (
        patch(
            "app.api.routes.generate.upload_image",
            new=AsyncMock(side_effect=["t1", "t2", "t3", "t4"]),
        ),
        patch(
            "app.api.routes.generate.create_multiview_task",
            new=AsyncMock(return_value="task-mv-detailed"),
        ) as create_mock,
    ):
        response = client.post(
            "/api/generate/multiview",
            files=_mv_files(),
            data={"quality": "detailed"},
        )

    assert response.status_code == 200
    create_mock.assert_awaited_once()
    assert create_mock.await_args.kwargs["geometry_quality"] == "detailed"


def test_generate_multiview_bogus_quality_falls_back(client):
    """Anything other than 'standard'|'detailed' should be coerced to 'standard'."""
    with (
        patch(
            "app.api.routes.generate.upload_image",
            new=AsyncMock(side_effect=["t1", "t2", "t3", "t4"]),
        ),
        patch(
            "app.api.routes.generate.create_multiview_task",
            new=AsyncMock(return_value="task-mv"),
        ) as create_mock,
    ):
        response = client.post(
            "/api/generate/multiview",
            files=_mv_files(),
            data={"quality": "ultra-max-9000"},
        )

    assert response.status_code == 200
    assert create_mock.await_args.kwargs["geometry_quality"] == "standard"


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
