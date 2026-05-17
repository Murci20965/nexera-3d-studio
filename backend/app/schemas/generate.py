from pydantic import BaseModel


class TextGenerateRequest(BaseModel):
    prompt: str
    quality: str = "balanced"   # "balanced" | "high-detail"
    low_poly: bool = False


class TaskIdResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    status: str
    progress: int
    model_url: str | None
