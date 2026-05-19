# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Nexera 3D Studio — Claude context

Project-specific context auto-loaded into every Claude Code session in this repo. Keep this file lean — it competes for context window space with the user's actual question.

## What this app does

Web app that turns text prompts or images into 3D models via Tripo3D's v3.1 API. Built for Nexera Holdings' XR education stack.

## Stack

- **Frontend:** Next.js 16 (App Router, all `"use client"`) + Three.js viewer
- **Backend:** FastAPI + httpx (async Tripo client) + Pydantic v2
- **3D pipeline:** Tripo3D v3.1 (PBR in a single pass, optional auto-retopology)
- **Deployed:** Frontend → Vercel (`https://frontend-eta-snowy-duf51o4ma2.vercel.app`), Backend → Render (`https://nexera-backend-c6qt.onrender.com`)

## Where things live

| Path | Responsibility |
|------|----------------|
| `backend/app/main.py` | FastAPI entry, CORS, Windows asyncio fix |
| `backend/app/api/routes/generate.py` | REST endpoints + 20 MB upload guard |
| `backend/app/services/tripo.py` | Tripo3D HTTP client |
| `backend/app/schemas/generate.py` | Pydantic models |
| `backend/app/config/settings.py` | env loader (`.env` first, `../.env` fallback) |
| `frontend/app/page.jsx` | Single full-screen page, layout state |
| `frontend/app/globals.css` | All CSS — single file, CSS custom properties in `:root` |
| `frontend/components/viewer/ModelViewer.jsx` | Three.js scene (GridHelper, GLTFLoader, OrbitControls) |
| `frontend/components/generator/GeneratorForm.jsx` | Text/image input panel |
| `frontend/components/ui/ProgressBar.jsx` | Generation progress indicator |
| `frontend/hooks/useGeneration.js` | Polling + state for generation tasks |
| `frontend/lib/api.js` | Backend fetch wrappers |

## Commands

```powershell
# backend dev
cd backend; uvicorn app.main:app --reload --port 8000

# frontend dev
cd frontend; npm run dev

# backend tests (run from backend/)
cd backend; pytest
cd backend; pytest tests/test_routes.py::test_health -v   # single test

# frontend tests
cd frontend; npm test
cd frontend; npx vitest run __tests__/useGeneration.test.js  # single file

# both via docker
docker compose up --build

# backend smoke test
cd backend; python -c "from app.main import app; print(app.title)"

# frontend smoke test
cd frontend; npx next build
```

## Deployment

Both services auto-deploy on push to `main`.

To update backend env vars (e.g. rotate `TRIPO_API_KEY`):
1. Update `backend/.env` locally
2. Use Render API or dashboard — the key is a bulk-replace: `PUT /v1/services/srv-d850m3rtqb8s73eeklv0/env-vars`
3. Trigger a redeploy via `POST /v1/services/srv-d850m3rtqb8s73eeklv0/deploys`

`NEXT_PUBLIC_API_URL` is **baked into the Vercel build** at compile time — changing it as a runtime env var has no effect. Must redeploy after updating it in the Vercel project settings.

## Conventions & watch-outs

- **Windows asyncio fix** — `main.py` sets `WindowsSelectorEventLoopPolicy` before any imports. **Don't move or remove this.** Default `ProactorEventLoop` on Windows has a `getaddrinfo` bug that breaks httpx DNS.
- **Tripo model version** — pinned via `TRIPO_MODEL_VERSION`, default `v3.1-20260211`. Don't guess; wrong strings return error code `2017`. Confirm in the Tripo dashboard before bumping.
- **GLB CORS** — Tripo's CDN URLs cannot load directly in the browser. Always wrap with `/api/proxy-model?url=...`. The frontend's `useGeneration` hook already does this.
- **3D viewer = Three.js, NOT model-viewer.** We deliberately switched. Reject any reintroduction of `@google/model-viewer` or CSS perspective grids — they break the "model standing on floor" effect.
- **Model rotation** — `OrbitControls.autoRotate` is disabled (rotates the grid too). The render loop mutates `model.rotation.y` directly. User drag pauses the spin via `controls.addEventListener("start"/"end")`.
- **Image-to-3D prompt limitation** — Tripo's `image_to_model` uses the uploaded image as the dominant color/texture reference. Prompts influence shape/style but cannot override the image's colors. This is API behavior, not a bug — the GeneratorForm already shows a note about it.
- **Run uvicorn from `backend/`** — `app.X` imports resolve relative to that directory.
- **CSS architecture** — All styles live in `globals.css` as a single file. All colors are CSS custom properties defined once in `:root`. Never add hardcoded colour values to component files; always use or add a CSS var.
- **Three.js init is async** — `ModelViewer` runs `import("three")` lazily inside a `useEffect`. The `cancelled` flag prevents React 18 StrictMode from creating two WebGL renderers. Don't remove it.

## When changing code

- New env vars → add to `backend/app/config/settings.py` **and** `backend/.env.example`.
- New endpoints → add to README's API table and ARCHITECTURE.md if structural.
- Editing `backend/app/config/settings.py` → restart the backend even with `--reload` (env loads once at import time).
- Touching the viewer → take a fresh screenshot before claiming the change works; visual regressions don't show up in builds.
- Render free tier spins down after 15 min idle (cold start ~30 s). UptimeRobot pings `/health` every 5 min to keep it warm.

## Related docs

- [README.md](./README.md) — public-facing overview, setup, deployment
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, data flow
- [CONTRIBUTING.md](./CONTRIBUTING.md) — branching, conventions, PR workflow
