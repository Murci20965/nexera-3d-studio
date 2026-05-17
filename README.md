# Nexera 3D Studio

Generate production-quality 3D models from text prompts or images. Built on the Tripo3D v3.1 API, with a real-time Three.js viewer for in-browser preview.

> Built for Nexera Holdings' XR education stack.

---

## Features

- **Text → 3D** with quality presets (balanced / high-detail with auto-retopology)
- **Image → 3D** with optional prompt hints
- **Low-poly mode** for stylized or game-ready assets (800-face budget, flat shading)
- **PBR textures** generated in a single pass — no separate texture step
- **Live 3D viewer** with perspective grid floor, soft shadows, orbit controls
- **GLB download** ready for Blender, Unity, Unreal, or any glTF-aware tool

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router) · React 18 · Three.js (`GridHelper`, `GLTFLoader`, `OrbitControls`) |
| Backend | FastAPI · httpx (async) · Pydantic v2 |
| 3D generation | [Tripo3D API v3.1](https://platform.tripo3d.ai) — HD Model V3.1, PBR, auto-retopology |
| Deployment | Docker + docker-compose |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for request flow and module-level layout.

## Project layout

```
.
├── backend/                  FastAPI service
│   ├── app/
│   │   ├── main.py           FastAPI entry
│   │   ├── api/routes/       HTTP endpoints
│   │   ├── services/         Tripo3D client
│   │   ├── schemas/          Pydantic models
│   │   └── config/           env-driven settings
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 Next.js + Three.js viewer
│   ├── app/                  page.jsx, layout.jsx, globals.css
│   ├── components/           GeneratorForm, ModelViewer, UI primitives
│   ├── hooks/                useGeneration (polling + state)
│   ├── lib/                  API client
│   └── Dockerfile
├── .claude/                  Claude Code project config (settings, agents, skills)
├── docker-compose.yml        Brings both services up
├── ARCHITECTURE.md           System design + data flow
├── CONTRIBUTING.md           Dev workflow
├── CLAUDE.md                 Project context for AI sessions
└── LICENSE                   MIT
```

## Prerequisites

- Python 3.12+
- Node 20+
- A free Tripo3D API key — https://platform.tripo3d.ai

## Local development

```powershell
# 1. Configure secrets
copy backend\.env.example backend\.env
# Edit backend\.env and set TRIPO_API_KEY

# 2. Backend (terminal 1)
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend (terminal 2)
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

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000
- Health:   http://localhost:8000/health

## Environment variables

| Name | Location | Purpose |
|------|----------|---------|
| `TRIPO_API_KEY` | `backend/.env` | Tripo3D bearer token (**required**) |
| `TRIPO_MODEL_VERSION` | `backend/.env` | Pin model version, default `v3.1-20260211` |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Backend URL the frontend hits, default `http://localhost:8000` |

## API reference

| Method | Path | Body / Query | Returns |
|--------|------|--------------|---------|
| `POST` | `/api/generate/text` | `{prompt, quality, low_poly}` | `{task_id}` |
| `POST` | `/api/generate/image` | multipart: `file`, `prompt` | `{task_id}` |
| `GET`  | `/api/task/{task_id}` | — | `{status, progress, model_url}` |
| `GET`  | `/api/proxy-model?url=...` | Tripo CDN URL | streamed GLB bytes |
| `GET`  | `/health` | — | `{status: "ok"}` |

Full OpenAPI spec is served at http://localhost:8000/docs.

## Deployment

The Dockerfiles are production-ready and can be deployed to any container host:

- **Frontend:** Vercel, Render, Railway, Fly.io
- **Backend:** Render, Railway, Fly.io, AWS App Runner, Google Cloud Run

Set `TRIPO_API_KEY` in the backend host's secret manager and point `NEXT_PUBLIC_API_URL` at the deployed backend URL.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, data flow, design decisions
- [CONTRIBUTING.md](./CONTRIBUTING.md) — dev setup, branching, conventions
- [CLAUDE.md](./CLAUDE.md) — project context auto-loaded by Claude Code sessions
- [.claude/agents/nexera-reviewer.md](./.claude/agents/nexera-reviewer.md) — code review subagent
- [.claude/skills/pre-deploy-check/SKILL.md](./.claude/skills/pre-deploy-check/SKILL.md) — pre-deploy verification skill

## License

MIT — see [LICENSE](./LICENSE).
