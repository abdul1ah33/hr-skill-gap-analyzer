# clients/

One env file per client: `clients/<name>.env` holds that client's backend settings (database URL with its own database user, `SECRET_KEY`, Gemini key, frontend URL). The `api-<name>` service in `docker-compose.yml` reads it.

- Files are created by `provision_client`; [example.env](example.env) shows the format.
- They contain secrets and are **not committed** (`.gitignore`). Back them up together with the database backups: without its env file a client's database password and `SECRET_KEY` are lost.
- `upgrade_clients` migrates every client that has a file here.

See [docs/deployment.md](../docs/deployment.md).
