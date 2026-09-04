# Registro Salidas

A shared "loyalty card" for hangouts — sign up, create a group, invite someone with a link, and log every time you meet up. Every 10 salidas completes a card with a custom icon.

## Live frontend
https://ursaminor3.github.io/FidelityPassCard/

## Architecture
- **Frontend:** plain HTML/CSS/JS, no build step, hosted free on GitHub Pages.
- **Backend:** FastAPI (Python), in `api/` — same pattern as the Aperture AI project (Render, Docker runtime, Root Directory `api`).
- **Database:** Postgres (Neon's free tier recommended — same choice as Aperture AI, since Render's own free Postgres expires after 90 days and Neon's doesn't).

## One-time backend setup (you do this once in the Render/Neon dashboards)

1. **Create a Neon Postgres project** (neon.tech, free tier) — grab its pooled connection string.
2. **Create a Render Web Service**, connect it to this GitHub repo:
   - Runtime: **Docker**
   - Root Directory: `api`
   - Instance type: Free
3. In the Render service's **Environment** tab, add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `JWT_SECRET` | any long random string |
4. Deploy. Render will build the Docker image and give you a live URL like `https://registro-salidas-api.onrender.com`.
5. Open `script.js` in this repo and update the `API_BASE` constant at the top to that exact URL, then commit/push — GitHub Pages picks it up automatically.

From then on: **push to `main` → Render auto-redeploys the backend, GitHub Pages auto-redeploys the frontend.** No manual deploy steps, ever.

> Free-tier heads up: Render's free web services spin down after ~15 min idle and take 30–50s to wake on the next request. Normal for a personal project like this.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | `{name, last_name, username, email, password}` → account + token |
| POST | `/auth/login` | — | `{identifier, password}` → token (identifier = username or email) |
| GET | `/auth/me` | ✅ | current user |
| POST | `/groups` | ✅ | `{name}` → creates a group, creator auto-joins |
| GET | `/groups/mine` | ✅ | groups the current user belongs to |
| GET | `/groups/{id}` | ✅ | one group's stamp state |
| PATCH | `/groups/{id}` | ✅ | `{name?, completed_icon?}` |
| POST | `/groups/{id}/log` | ✅ | logs a hangout, returns updated state |
| POST | `/groups/join/{invite_token}` | ✅ | joins a group via its invite link |
| GET | `/health` | — | health check |

Auth is a Bearer JWT (`Authorization: Bearer <token>`), returned by signup/login and stored in the browser's `localStorage`.

## Invite links
Every group has an `invite_token`. The frontend builds the link as
`https://ursaminor3.github.io/FidelityPassCard/?join=<token>` — opening it prompts login/signup, then joins that group automatically.

## Local backend dev
```bash
cd api
cp .env.example .env   # fill in a local/dev DATABASE_URL
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Add the frontend to your home screen
**iPhone (Safari):** Share → *Add to Home Screen*.
**Android (Chrome):** ⋮ menu → *Add to Home screen*.
