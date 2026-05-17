---
name: pre-deploy-check
description: Pre-deployment verification walkthrough for Nexera 3D Studio. Run before pushing to main or shipping a build. Checks for staged secrets, that the backend imports cleanly, that the frontend builds, and that env documentation is in sync.
---

# Pre-deployment check

Walk through these checks in order. **Bail at the first failure** and report what broke — don't keep running if step 1 fails. Don't push for the user; pushing is their decision.

## 1. No secrets staged

```powershell
git diff --cached | Select-String -Pattern "TRIPO_API_KEY|github_pat_|sk-|password|secret" 
```

Should output nothing. Any match → **block** and tell the user exactly which line.

## 2. Backend imports cleanly

```powershell
cd backend; python -c "from app.main import app; print('OK:', app.title)"
```

Must print `OK: Nexera 3D Studio API`. Any import error → block.

## 3. Frontend builds

```powershell
cd frontend; npx next build
```

Must end with a route table and `prerendered as static content`. Type errors or build failures → block.

## 4. Required env vars documented

- Every variable read by `backend/app/config/settings.py` is in `.env.example`.
- Every `NEXT_PUBLIC_*` referenced in `frontend/lib/api.js` is in `frontend/.env.local.example`.

If a var is missing from the example file, add it (with a placeholder value, not the real secret).

## 5. Health endpoint works

With the backend running locally:

```powershell
Invoke-WebRequest http://localhost:8000/health | Select-Object -ExpandProperty Content
```

Should return `{"status":"ok"}`. If the backend isn't running, start it first.

## 6. Git status clean

```powershell
git status --short
```

No untracked source files. (`.env`, `node_modules/`, `.next/` are fine — they're gitignored.)

## When all pass

Report: **"Pre-deploy check passed. Ready to push."** Then ask the user whether to push — don't do it autonomously.
