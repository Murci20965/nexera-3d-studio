# Architecture

## High-level flow

```
┌─────────────┐     POST /api/generate/text       ┌──────────────┐
│  Frontend   │ ───────────────────────────────▶  │   Backend    │
│  (Next.js + │                                    │  (FastAPI)   │
│   Three.js) │ ◀───  GET /api/task/{id}  ───▶    │              │
└──────┬──────┘       (poll every 5 s)             └──────┬───────┘
       │                                                  │
       │  GET /api/proxy-model?url=...                    │  POST /task
       │  (stream GLB through backend)                    │  (Tripo3D API)
       │                                                  ▼
       │                                           ┌──────────────┐
       │                                           │   Tripo3D    │
       │                                           │   v3.1 API   │
       │                                           └──────┬───────┘
       │                                                  │
       │                                                  ▼
       │                                           ┌──────────────┐
       └─── streamed bytes ◀── proxy ◀──────────── │  Tripo CDN   │
                                                   │  (GLB files) │
                                                   └──────────────┘
```

## Why the GLB proxy?

Tripo's CDN serves model files with restrictive CORS headers, so the browser cannot fetch them directly. `GET /api/proxy-model?url=...` streams the GLB through the FastAPI backend (which has no such constraint) and returns it to the browser as `model/gltf-binary`. The frontend never talks to Tripo's CDN directly.

## Backend layout

| Module | Responsibility |
|--------|----------------|
| `app/main.py` | FastAPI construction, CORS, Windows asyncio fix |
| `app/config/settings.py` | Load `.env`, expose typed settings |
| `app/api/routes/generate.py` | HTTP endpoints, request validation, response shaping |
| `app/services/tripo.py` | Tripo3D HTTP client, auth headers, error normalization |
| `app/schemas/generate.py` | Pydantic request/response models |

Routes are thin — they validate input and orchestrate. All HTTP-to-Tripo logic lives in `services/tripo.py`.

## Frontend layout

| Module | Responsibility |
|--------|----------------|
| `app/page.jsx` | Full-screen layout: viewer + side panel + download bar |
| `app/layout.jsx` | Root HTML, font, metadata |
| `components/generator/GeneratorForm.jsx` | Tabbed input panel, quality/low-poly toggles |
| `components/viewer/ModelViewer.jsx` | Three.js scene: camera, lights, GridHelper, GLTFLoader, OrbitControls |
| `components/ui/ProgressBar.jsx` | Standalone progress display |
| `hooks/useGeneration.js` | Owns generation state — isLoading, progress, polling, model URL |
| `lib/api.js` | Fetch wrappers for the three backend endpoints |

## 3D viewer design

The viewer is a custom Three.js scene, **not** `@google/model-viewer`. Why:

- We needed a true 3D perspective grid floor the model could stand on. CSS-perspective grids never align with the WebGL camera, so the model always looked like it was floating.
- Three.js `GridHelper` + a `ShadowMaterial` ground plane gives a real horizon, real shadows on the grid, and a model whose feet visibly rest on the floor.
- The camera does **not** auto-orbit (that would rotate the grid too). Instead we mutate `model.rotation.y` directly in the render loop. `OrbitControls.autoRotate` is disabled; user drag/zoom is still enabled.

## Generation lifecycle

1. User submits prompt (or image + prompt).
2. Frontend POSTs `/api/generate/text` or `/api/generate/image`. Backend creates a Tripo task and returns `task_id`.
3. Frontend polls `GET /api/task/{task_id}` every 5 s, updates progress bar.
4. When status flips to `success`, backend response includes `model_url` (a Tripo CDN URL).
5. Frontend rewrites the URL to `/api/proxy-model?url=<tripo_url>` and hands it to `ModelViewer`.
6. `GLTFLoader` fetches via the proxy, parses the GLB, scales the model to fit a 2-unit bounding box, and places `box.min.y` at `Y=0` so the feet sit on the grid plane.

## Configuration boundary

- Backend reads env from `backend/.env` (or the project-root `.env` as a fallback).
- Frontend reads `NEXT_PUBLIC_API_URL` from `frontend/.env.local`.

These are the only runtime knobs.

## Why FastAPI + Next.js (and not one stack)?

- FastAPI gives async I/O for the long-poll Tripo calls without thread sprawl, and Pydantic for typed request/response models.
- Next.js handles the UI, hydration, and static asset pipeline. Three.js runs entirely client-side.
- Splitting them keeps the 3D viewer's bundle size out of the API service and lets each scale independently.
