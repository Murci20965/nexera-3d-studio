import httpx
import pytest
import respx
from fastapi import HTTPException


# ── create_text_task ──────────────────────────────────────────────────────────

async def test_create_text_task_success():
    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/task").mock(
            return_value=httpx.Response(200, json={"data": {"task_id": "abc123"}})
        )
        from app.services.tripo import create_text_task
        task_id = await create_text_task("a red car")
    assert task_id == "abc123"


async def test_create_text_task_missing_api_key(monkeypatch):
    monkeypatch.delenv("TRIPO_API_KEY")
    from app.services.tripo import create_text_task
    with pytest.raises(HTTPException) as exc_info:
        await create_text_task("a red car")
    assert exc_info.value.status_code == 500


async def test_create_text_task_tripo_error():
    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/task").mock(
            return_value=httpx.Response(400, json={"code": 2017, "message": "invalid model version"})
        )
        from app.services.tripo import create_text_task
        with pytest.raises(HTTPException) as exc_info:
            await create_text_task("a dragon")
    assert exc_info.value.status_code == 400


# ── upload_image ──────────────────────────────────────────────────────────────

async def test_upload_image_success():
    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/upload").mock(
            return_value=httpx.Response(200, json={"data": {"image_token": "tok-xyz"}})
        )
        from app.services.tripo import upload_image
        token = await upload_image(b"fakebytes", "photo.jpg", "image/jpeg")
    assert token == "tok-xyz"


async def test_upload_image_error():
    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/upload").mock(
            return_value=httpx.Response(413, json={"message": "too large"})
        )
        from app.services.tripo import upload_image
        with pytest.raises(HTTPException) as exc_info:
            await upload_image(b"data", "f.png", "image/png")
    assert exc_info.value.status_code == 413


# ── create_image_task ─────────────────────────────────────────────────────────

async def test_create_image_task_success():
    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/task").mock(
            return_value=httpx.Response(200, json={"data": {"task_id": "img-task-99"}})
        )
        from app.services.tripo import create_image_task
        task_id = await create_image_task("tok-xyz", file_type="jpg", prompt="make it shiny")
    assert task_id == "img-task-99"


# ── create_multiview_task ─────────────────────────────────────────────────────

def _mv_payload(count: int):
    return [{"file_token": f"tok-{i}", "type": "png"} for i in range(count)]


async def test_create_multiview_task_success():
    captured = {}

    def _record(request):
        import json
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"data": {"task_id": "mv-task-1"}})

    with respx.mock:
        respx.post("https://api.tripo3d.ai/v2/openapi/task").mock(side_effect=_record)
        from app.services.tripo import create_multiview_task
        task_id = await create_multiview_task(_mv_payload(4), prompt="a chair")

    assert task_id == "mv-task-1"
    body = captured["body"]
    assert body["type"] == "multiview_to_model"
    assert body["prompt"] == "a chair"
    assert [f["file_token"] for f in body["files"]] == ["tok-0", "tok-1", "tok-2", "tok-3"]


async def test_create_multiview_task_wrong_count():
    from app.services.tripo import create_multiview_task
    for n in (0, 1, 3, 5):
        with pytest.raises(HTTPException) as exc_info:
            await create_multiview_task(_mv_payload(n))
        assert exc_info.value.status_code == 422


# ── get_task_status ───────────────────────────────────────────────────────────

async def test_get_task_status_success():
    payload = {
        "data": {
            "status": "success",
            "progress": 100,
            "output": {"pbr_model": "https://cdn.tripo3d.ai/m.glb"},
        }
    }
    with respx.mock:
        respx.get("https://api.tripo3d.ai/v2/openapi/task/t1").mock(
            return_value=httpx.Response(200, json=payload)
        )
        from app.services.tripo import get_task_status
        result = await get_task_status("t1")
    assert result["status"] == "success"
    assert result["progress"] == 100
    assert result["model_url"] == "https://cdn.tripo3d.ai/m.glb"


async def test_get_task_status_processing():
    payload = {"data": {"status": "processing", "progress": 55, "output": None}}
    with respx.mock:
        respx.get("https://api.tripo3d.ai/v2/openapi/task/t2").mock(
            return_value=httpx.Response(200, json=payload)
        )
        from app.services.tripo import get_task_status
        result = await get_task_status("t2")
    assert result["status"] == "processing"
    assert result["model_url"] is None


async def test_get_task_status_tripo_error():
    with respx.mock:
        respx.get("https://api.tripo3d.ai/v2/openapi/task/bad").mock(
            return_value=httpx.Response(404, json={"message": "not found"})
        )
        from app.services.tripo import get_task_status
        with pytest.raises(HTTPException) as exc_info:
            await get_task_status("bad")
    assert exc_info.value.status_code == 404
