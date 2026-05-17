# Contributing

## Setup

See [README.md](./README.md#local-development) for first-time setup. Quick version:

```powershell
copy backend\.env.example backend\.env   # add TRIPO_API_KEY
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# in another terminal
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Branching

- `main` is always deployable. Don't push to it directly.
- Feature branches: `feat/short-description`
- Fix branches: `fix/short-description`
- Open a PR back to `main`. At least one review before merge.

## Commit messages

Imperative mood, present tense, under 72 chars on the first line:

```
add image-to-3D drop-zone preview
fix Windows asyncio DNS resolution
refactor ModelViewer to use Three.js directly
```

If the PR closes an issue, add `Closes #N` to the description.

## Code conventions

- **Python:** 4-space indent, type hints on function signatures, `async` for all I/O.
- **JavaScript:** 2-space indent, ES modules, prefer functional components + hooks.
- **No comments explaining what the code does** — well-named identifiers do that. Comments are for *why* (non-obvious decisions, workarounds, invariants).
- See [CLAUDE.md](./CLAUDE.md) for project-specific conventions and watch-outs.

## Before pushing

1. `npx next build` in `frontend/` — must compile.
2. `python -c "from app.main import app"` in `backend/` — must import.
3. Generate at least one model end-to-end if you touched the generation pipeline.
4. Don't commit `.env`, secrets, screenshots, or generated models — `.gitignore` covers these.

## Reporting bugs

Open an issue with:

- What you did (exact prompt / file uploaded).
- What you expected.
- What happened (error message, screenshot, console output).
- Browser + OS.

## Architectural changes

For non-trivial structural changes (new service, new dependency, breaking API change), open an issue first to discuss before writing code.
