# ShopSnap — Deployment Runbook

Two separately-deployable packages, each with its own runtime, port and start command.
Everything below runs on the developer's own machine — no hosting provider, registry or
managed CI is assumed. Ports and URLs come from the environment; nothing is hardcoded.

| Target | Dir | Runtime | Dev port | Build | Start |
|---|---|---|---|---|---|
| Backend API | `apps/backend` | Node 20+ | 8000 | `npm run build` (tsc) | `node dist/server.js` |
| Frontend SPA | `apps/frontend` | Node 20+ | 3000 | `npm run build` (tsc && vite build) | `npx serve -s dist -l $PORT` |

## Environment variables

Backend (`apps/backend`):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Port the Express server binds to |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins = `$FRONTEND_URL` |

Frontend (`apps/frontend`), read at **build** time by Vite:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the static server binds to |
| `VITE_BACKEND_URL` | `http://localhost:8000` | Base URL of the API = `$BACKEND_URL` |

No secrets or credentials are required, and none are stored in the repo.
Because `VITE_*` is inlined at build time, changing the backend URL requires a **rebuild**
of the frontend, not just a restart.

## 1. Deploy the backend (first — the frontend build points at it)

```bash
cd apps/backend
npm install
npm run build              # tsc -> dist/
npm test                   # vitest + supertest, must be green
PORT=8000 ALLOWED_ORIGINS=http://localhost:3000 node dist/server.js
```

Verify:

```bash
curl -fsS http://localhost:8000/api/health     # -> {"status":"ok"}
curl -fsS http://localhost:8000/api/products   # -> seeded catalog JSON
```

## 2. Deploy the frontend

In a second shell:

```bash
cd apps/frontend
npm install
npm test
VITE_BACKEND_URL=http://localhost:8000 npm run build   # tsc && vite build -> dist/
PORT=3000 npx serve -s dist -l 3000
```

Verify:

```bash
curl -fsSI http://localhost:3000/            # -> 200
```

Then open <http://localhost:3000> — the product grid must render items served by the
backend, and adding an item to the cart must update the cart badge. If the grid is empty,
the backend is down or `VITE_BACKEND_URL` was wrong at build time.

## Gate: nothing goes live on a failed build

`npm run build` and `npm test` must exit 0 in **both** packages before the change is
merged. Merge (which fires the pipeline) happens only after explicit human go-live
approval, performed by the orchestrator.

## Rollback

Both targets are stateless — there is no database migration and no persistent data to
restore, so rollback is "run the previous commit".

1. Stop both processes (`Ctrl-C`, or `kill` the `node dist/server.js` and `serve` PIDs).
2. `git checkout <previous-good-sha>` (or `git revert <merge-sha>` on the main branch).
3. Rebuild and restart both packages using the steps above, backend first.
4. Re-run the two verification curls; if `/api/health` answers and the grid renders, the
   rollback is complete.

Partial rollback is safe: the frontend can be reverted alone (rebuild with the old
`VITE_BACKEND_URL`) as long as the API contract on `/api/products` is unchanged.

## Optional: CI on the repo's own host

A GitHub Actions workflow at `.github/workflows/ci.yml` installs, builds and tests each
package on push/PR. It is build+test only — there is no deploy stage and no cloud
service connection.
