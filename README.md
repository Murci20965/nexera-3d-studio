# Nexera 3D Studio

Generate 3D models from text prompts or images using the Tripo3D API. Built for Nexera's XR education stack.

- **Backend:** FastAPI + httpx, proxying the Tripo3D v3.1 API.
- **Frontend:** Next.js 16 (App Router) + Three.js viewer with a perspective grid floor.

---

## Project layout

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI entry
│   │   ├── api/routes/          HTTP endpoints
│   │   ├── services/            Tripo3D client
│   │   ├── schemas/             Pydantic request/response models
│   │   └── config/              env-driven settings
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                     Next.js App Router (page.jsx, layout.jsx, globals.css)
│   ├── components/              GeneratorForm, ModelViewer, UI primitives
│   ├── hooks/                   useGeneration (polling + state)
│   ├── lib/                     API client
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml           Brings both services up together
└── .env.example                 Required environment variables
```

## Prerequisites

- Python 3.12+
- Node 20+
- A free Tripo3D API key — https://platform.tripo3d.ai

## Local development

```powershell
# 1. Configure secrets
copy .env.example .env
# Edit .env and set TRIPO_API_KEY

# 2. Backend
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend (in a second terminal)
cd frontend
copy .env.local.example .env.local
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:3000.

## Docker (one-shot)

```powershell
docker compose up --build
```

Frontend: http://localhost:3000 · Backend: http://localhost:8000

## Environment variables

| Name | Where | Purpose |
|------|-------|---------|
| `TRIPO_API_KEY` | `.env` | Tripo3D bearer token |
| `TRIPO_MODEL_VERSION` | `.env` (optional) | Pin Tripo model version, default `v3.1-20260211` |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Backend URL the frontend hits, default `http://localhost:8000` |

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/generate/text` | Submit a text-to-model task |
| `POST` | `/api/generate/image` | Submit an image-to-model task (multipart) |
| `GET`  | `/api/task/{task_id}` | Poll task status + final model URL |
| `GET`  | `/api/proxy-model?url=...` | Stream a GLB through the backend (avoids CORS) |
| `GET`  | `/health` | Liveness probe |
