# Deployment (one database per client)

Every client gets its own backend container and its own PostgreSQL database and database user. All clients run the same code. Background and reasoning: [plans/industry_templates_plan.md](plans/industry_templates_plan.md) §3.

| File | What it is |
|---|---|
| `docker-compose.yml` | proxy, postgres, one `api-<client>` service per client, `tools` |
| `backend/Dockerfile` | Backend image (build context: repository root) |
| `my_frontend/Dockerfile` | Proxy image: Caddy with the built frontend |
| `deploy/Caddyfile` | One site block per client |
| `deploy/compose.env.example` | Copy to `.env` (repository root): `POSTGRES_PASSWORD`, `GEMINI_API_KEY` |
| `clients/<name>.env` | One client's backend settings (not committed, see [clients/README.md](../clients/README.md)) |
| `backend/app/scripts/provision_client.py` | Set up a new client |
| `backend/app/scripts/upgrade_clients.py` | Migrate every client after a release |

---

## Layout

```
docker compose (one server)
 ├── proxy         Caddy + built frontend
 │                   client-a.<domain>/api/*  →  api-client-a:8000
 │                   client-a.<domain>/*      →  frontend
 │                   client-b.<domain>/api/*  →  api-client-b:8000 ...
 ├── api-client-a  backend, env_file clients/client_a.env
 ├── api-client-b  backend, env_file clients/client_b.env
 ├── postgres      one server: database client_a (user client_a), database client_b (user client_b)
 └── tools         one-off container for provision_client / upgrade_clients (profile "tools")
```

- **One frontend build for all clients.** It calls the API at the relative path `/api` (`VITE_API_URL=/api` at build time), so each client's domain reaches its own backend through the proxy and CORS isn't involved. (The plan had one frontend build per client; this is simpler and gives the same result.)
- The backend runs with `--root-path /api`. Caddy strips `/api` before forwarding, and the backend's redirects and `/api/docs` keep the prefix.
- Backend containers listen on 8000 inside the Docker network only. Only the proxy publishes a port (80).
- **Isolation:**
  - Each client has a unique `SECRET_KEY`, so client A's login token gets a 401 on client B.
  - Each client's database user can only connect to its own database (`REVOKE ALL ON DATABASE … FROM PUBLIC`).
  - Both are covered by `backend/tests/test_provisioning.py` and were checked by hand with two demo clients.

---

## First setup

```bash
cp deploy/compose.env.example .env      # set POSTGRES_PASSWORD (and GEMINI_API_KEY)
docker compose up -d postgres
```

Then provision each client (below) and start everything:

```bash
docker compose up -d --build
```

Locally, `http://client-a.localhost` and `http://client-b.localhost` work without DNS changes in Chrome, Edge and Firefox.

---

## Provisioning a client

One command, run in the tools container:

```bash
docker compose run --rm tools python -m app.scripts.provision_client client_c \
    --organization-name "Client C Hospital" --industry hospital --template hospital \
    --hr-email hr@client-c.com
```

Steps (each can be re-run; if one fails, fix the problem and run the same command again):

1. **Env file:** `clients/client_c.env` is created with a new database password, a new `SECRET_KEY`, `GEMINI_API_KEY` from `.env`, and `CORS_ORIGINS=http://client-c.localhost` (change it with `--cors-origin`). An existing file is reused.
2. **Database:** user `client_c` and database `client_c` (owned by that user) are created. Only that user and the admin can connect.
3. **Migrations:** `alembic upgrade head`.
4. **First data** (`init_client`): roles, organization settings, and the first HR user. The password comes from `HR_PASSWORD` (`docker compose run --rm -e HR_PASSWORD tools ...`), or is generated and printed once.
5. **Main question bank:** `import_question_bank`, skipped with `--skip-question-bank`.
6. **Industry template** (if `--template` is given): `apply_template`. See [templates.md](templates.md).
7. **Summary:** the HR login, plus the snippets to add for a new client.

The snippets go in two places. In `docker-compose.yml`:

```yaml
  api-client-c:
    <<: *api
    env_file:
      - path: clients/client_c.env
        required: false
```

In `deploy/Caddyfile`:

```
http://client-c.localhost {
	import client api-client-c
}
```

Then run `docker compose up -d --build api-client-c && docker compose restart proxy`.

The client name becomes the database name: 2–40 characters, lowercase letters, digits and `_`, starting with a letter.

### Real domains

In `deploy/Caddyfile`, remove the global `auto_https off` block and use the real names without `http://`, e.g. `client-a.example.com { import client api-client-a }`. Caddy then gets HTTPS certificates automatically (ports 80 and 443 must be reachable; add `"443:443"` to the proxy's ports). Set `CORS_ORIGINS` in the client's env file to the same URL.

---

## Upgrading (new release)

```bash
git pull
docker compose build
docker compose run --rm tools          # = python -m app.scripts.upgrade_clients
docker compose up -d
```

`upgrade_clients` runs `alembic upgrade head` and `import_question_bank` for every `clients/*.env`, in name order. It **stops at the first failure** and lists which clients were upgraded and which weren't. Fix the problem and run it again; finished steps are no-ops the second time. Options:

- `upgrade_clients client_a client_b` upgrades only those clients.
- `--skip-question-bank` runs only the migrations.

Write migrations so the old code still works on the new schema (add columns as nullable, for example). The containers restart only after every database has been migrated.

---

## Backups

Each client is one database, so back them up one by one:

```bash
docker compose exec -T postgres pg_dump -U postgres -Fc client_a > backups/client_a.dump
# restore into an empty database:
docker compose exec -T postgres pg_restore -U postgres -d client_a --no-owner --role=client_a < backups/client_a.dump
```

Also back up `clients/*.env`. Without its env file a client's database password and `SECRET_KEY` are lost. A new `SECRET_KEY` only logs everyone out, but keep it anyway.

---

## Scaling limits

From plan §3.4:

| Resource | Per client | Notes |
|---|---|---|
| DB connections | 2 pooled + 3 overflow (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`) | PostgreSQL allows 100 by default, so about 20 clients at peak. Raise `max_connections` or add PgBouncer beyond that |
| RAM | ~100–200 MB per backend container | 10 clients ≈ 1.5 GB + ~1 GB for PostgreSQL |
| CPU | Close to zero when idle | Gemini calls run on Google's servers |

- **Hosting:** 1–10 clients fit on one 4–8 GB VPS. Gemini is likely the biggest running cost; a `GEMINI_API_KEY` per client shows each client's usage.
- **Beyond ~30–50 clients:** switch to one backend that picks the database by subdomain. The per-client databases carry over unchanged.

---

## Local development

Nothing changes: run the backend with `uvicorn` and the frontend with `npm run dev` ([setup.md](setup.md)). The Docker setup is only for deployments.
