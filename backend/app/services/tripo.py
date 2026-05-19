import os
import json
import httpx
from fastapi import HTTPException

TRIPO_BASE_URL = "https://api.tripo3d.ai/v2/openapi"

TRIPO_MODEL_VERSION = os.getenv("TRIPO_MODEL_VERSION", "v3.1-20260211")


def _get_headers() -> dict[str, str]:
    api_key = os.getenv("TRIPO_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="TRIPO_API_KEY is not configured")
    return {"Authorization": f"Bearer {api_key}"}


def _raise_for_tripo_error(response: httpx.Response, context: str) -> None:
    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Tripo API error during {context}: {detail}",
        )


async def create_text_task(prompt: str, low_poly: bool = False, quad_remesh: bool = False) -> str:
    payload = {
        "type": "text_to_model",
        "prompt": prompt,
        "model_version": TRIPO_MODEL_VERSION,
        "texture": True,
        "pbr": True,
        "face_limit": 800 if low_poly else 500000,
    }
    if quad_remesh and not low_poly:
        payload["auto_refine"] = True

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TRIPO_BASE_URL}/task",
            json=payload,
            headers=_get_headers(),
        )
    _raise_for_tripo_error(response, "text_to_model task creation")
    return response.json()["data"]["task_id"]


async def upload_image(file_bytes: bytes, filename: str, content_type: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{TRIPO_BASE_URL}/upload",
            headers=_get_headers(),
            files={"file": (filename, file_bytes, content_type)},
        )
    _raise_for_tripo_error(response, "image upload")
    return response.json()["data"]["image_token"]


async def create_image_task(image_token: str, file_type: str = "png", prompt: str = "") -> str:
    payload: dict = {
        "type": "image_to_model",
        "model_version": TRIPO_MODEL_VERSION,
        "texture": True,
        "pbr": True,
        "file": {
            "type": file_type,
            "file_token": image_token,
        },
    }
    if prompt:
        payload["prompt"] = prompt

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TRIPO_BASE_URL}/task",
            json=payload,
            headers=_get_headers(),
        )
    _raise_for_tripo_error(response, "image_to_model task creation")
    return response.json()["data"]["task_id"]


async def create_multiview_task(
    files: list[dict],
    prompt: str = "",
) -> str:
    """Create a multiview_to_model task.

    `files` is an ordered list of exactly 4 dicts, one per view in
    [front, back, left, right] order. Each dict must contain
    `file_token` (str) and `type` (str, e.g. 'png'/'jpg').
    """
    if len(files) != 4:
        raise HTTPException(
            status_code=422,
            detail="multiview requires exactly 4 images (front, back, left, right)",
        )

    payload: dict = {
        "type": "multiview_to_model",
        "model_version": TRIPO_MODEL_VERSION,
        "texture": True,
        "pbr": True,
        "files": [
            {"type": f["type"], "file_token": f["file_token"]} for f in files
        ],
    }
    if prompt:
        payload["prompt"] = prompt

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TRIPO_BASE_URL}/task",
            json=payload,
            headers=_get_headers(),
        )
    _raise_for_tripo_error(response, "multiview_to_model task creation")
    return response.json()["data"]["task_id"]


async def get_task_status(task_id: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{TRIPO_BASE_URL}/task/{task_id}",
            headers=_get_headers(),
        )
    _raise_for_tripo_error(response, "task status poll")
    task_data = response.json()["data"]

    status = task_data.get("status", "unknown")
    progress = task_data.get("progress", 0)
    output = task_data.get("output") or {}

    model_url = (
        output.get("model")
        or output.get("pbr_model")
        or output.get("model_mesh")
        or output.get("rendered_model")
    )

    if status == "success":
        print(f"[tripo] task {task_id} success. output keys: {list(output.keys())}")
        print(f"[tripo] full output: {json.dumps(output)}")

    return {
        "status": status,
        "progress": progress,
        "model_url": model_url,
    }
