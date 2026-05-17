import mimetypes
import httpx

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.schemas.generate import TextGenerateRequest, TaskIdResponse, TaskStatusResponse
from app.services.tripo import create_text_task, upload_image, create_image_task, get_task_status

router = APIRouter(prefix="/api", tags=["generate"])

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/generate/text", response_model=TaskIdResponse)
async def generate_from_text(body: TextGenerateRequest):
    if not body.prompt.strip():
        raise HTTPException(status_code=422, detail="prompt must not be empty")

    quad_remesh = body.quality == "high-detail" and not body.low_poly
    task_id = await create_text_task(
        prompt=body.prompt,
        low_poly=body.low_poly,
        quad_remesh=quad_remesh,
    )
    return TaskIdResponse(task_id=task_id)


@router.post("/generate/image", response_model=TaskIdResponse)
async def generate_from_image(
    file: UploadFile = File(...),
    prompt: str = Form(default=""),
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit")

    content_type = file.content_type or "image/png"
    ext = (mimetypes.guess_extension(content_type) or ".png").lstrip(".")
    if ext in ("jpe", "jpeg"):
        ext = "jpg"

    filename = file.filename or f"upload.{ext}"
    image_token = await upload_image(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
    )
    task_id = await create_image_task(
        image_token=image_token,
        file_type=ext,
        prompt=prompt.strip(),
    )
    return TaskIdResponse(task_id=task_id)


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def poll_task(task_id: str):
    result = await get_task_status(task_id)
    return TaskStatusResponse(**result)


@router.get("/proxy-model")
async def proxy_model(url: str):
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid model URL")

    async def stream_glb():
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("GET", url) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    return StreamingResponse(
        stream_glb(),
        media_type="model/gltf-binary",
        headers={"Content-Disposition": 'inline; filename="model.glb"'},
    )
