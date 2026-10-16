"""
Phase 5 of the industry templates plan: provision_client and upgrade_clients.

These create real databases and users on the test PostgreSQL server (named
pytest_client_*) and drop them afterwards.
"""
import os
from pathlib import Path

import psycopg
import pytest
from jose import JWTError, jwt
from psycopg import sql
from sqlalchemy.engine import make_url

from app.scripts import provision_client, upgrade_clients
from app.scripts.client_env import StepError, check_client_name, new_env, read_env

pytestmark = pytest.mark.integration

MINI = Path(__file__).resolve().parent / "fixtures" / "templates" / "mini"
CLIENTS = ("pytest_client_a", "pytest_client_b")


def _conninfo(url) -> str:
    return url.render_as_string(hide_password=False).replace("postgresql+psycopg://", "postgresql://", 1)


@pytest.fixture(scope="module")
def server():
    """Admin connection info and host:port of the test server."""
    url = make_url(os.environ["DATABASE_URL"])
    return _conninfo(url.set(database="postgres")), f"{url.host or 'localhost'}:{url.port or 5432}"


def _drop_clients(admin: str) -> None:
    with psycopg.connect(admin, autocommit=True) as conn:
        for name in CLIENTS:
            conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(name)))
            conn.execute(sql.SQL("DROP ROLE IF EXISTS {}").format(sql.Identifier(name)))


@pytest.fixture(scope="module")
def provisioned(server, tmp_path_factory):
    """Both demo clients, provisioned with the mini template."""
    admin, host = server
    clients_dir = tmp_path_factory.mktemp("clients")
    _drop_clients(admin)
    os.environ["POSTGRES_ADMIN_URL"] = admin
    os.environ["HR_PASSWORD"] = "test-password"
    try:
        for name in CLIENTS:
            code = provision_client.main([
                name,
                "--organization-name", f"{name} Port",
                "--template", str(MINI),
                "--hr-email", f"hr@{name}.test",
                "--db-host", host,
                "--skip-question-bank",
                "--clients-dir", str(clients_dir),
            ])
            assert code == 0
        yield clients_dir
    finally:
        os.environ.pop("POSTGRES_ADMIN_URL", None)
        os.environ.pop("HR_PASSWORD", None)
        _drop_clients(admin)


def _client_conninfo(clients_dir: Path, name: str) -> str:
    return _conninfo(make_url(read_env(clients_dir / f"{name}.env")["DATABASE_URL"]))


# ─── Helpers ─────────────────────────────────────────────────────────────────

def test_client_names_are_checked():
    assert check_client_name("client_a") == "client_a"
    for bad in ("Client_A", "client-a", "1client", "a", "x" * 41):
        with pytest.raises(StepError):
            check_client_name(bad)


def test_new_env_files_get_their_own_secrets():
    first, second = new_env("client_a", "postgres", "http://a"), new_env("client_a", "postgres", "http://a")

    assert "@postgres:5432/client_a" in first
    assert "CORS_ORIGINS=http://a" in first
    secret = [line for line in first.splitlines() if line.startswith("SECRET_KEY=")]
    assert secret and secret[0] not in second


# ─── Provisioning ────────────────────────────────────────────────────────────

def test_provisioned_client_has_its_data(provisioned):
    with psycopg.connect(_client_conninfo(provisioned, "pytest_client_a")) as conn:
        assert conn.execute("SELECT name, industry, template_key FROM organization_settings").fetchone() == (
            "pytest_client_a Port", "port", "mini",
        )
        assert conn.execute(
            "SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = 'hr@pytest_client_a.test'"
        ).fetchone() == ("HR",)
        assert conn.execute("SELECT count(*) FROM positions").fetchone() == (3,)


def test_a_client_user_cannot_open_another_clients_database(provisioned):
    other = make_url(read_env(provisioned / "pytest_client_b.env")["DATABASE_URL"])

    with pytest.raises(psycopg.OperationalError, match="permission denied"):
        psycopg.connect(_conninfo(other.set(database="pytest_client_a"))).close()


def test_a_clients_token_is_rejected_by_another_client(provisioned):
    key_a = read_env(provisioned / "pytest_client_a.env")["SECRET_KEY"]
    key_b = read_env(provisioned / "pytest_client_b.env")["SECRET_KEY"]
    token = jwt.encode({"user_id": 1, "role": "HR"}, key_a, algorithm="HS256")

    with pytest.raises(JWTError):
        jwt.decode(token, key_b, algorithms=["HS256"])


def test_provisioning_again_changes_nothing(provisioned, server, capfd):
    _, host = server
    env_before = (provisioned / "pytest_client_a.env").read_text()

    code = provision_client.main([
        "pytest_client_a",
        "--organization-name", "Another Name",
        "--template", str(MINI),
        "--hr-email", "hr@pytest_client_a.test",
        "--db-host", host,
        "--skip-question-bank",
        "--clients-dir", str(provisioned),
    ])

    assert code == 0
    assert (provisioned / "pytest_client_a.env").read_text() == env_before
    # Steps run as child processes, so read the real output streams
    out = capfd.readouterr().out
    assert "already exists, reused" in out
    assert "User already exists" in out
    with psycopg.connect(_client_conninfo(provisioned, "pytest_client_a")) as conn:
        assert conn.execute("SELECT name FROM organization_settings").fetchone() == ("pytest_client_a Port",)
        assert conn.execute("SELECT count(*) FROM positions").fetchone() == (3,)


def test_provisioning_without_admin_url_fails_cleanly(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("POSTGRES_ADMIN_URL", raising=False)

    code = provision_client.main([
        "pytest_client_x", "--organization-name", "X", "--hr-email", "hr@x.test",
        "--clients-dir", str(tmp_path),
    ])

    assert code == 1
    assert "POSTGRES_ADMIN_URL is not set" in capsys.readouterr().out


# ─── Upgrades ────────────────────────────────────────────────────────────────

def test_upgrade_migrates_every_client(provisioned, capsys):
    assert upgrade_clients.main(["--clients-dir", str(provisioned), "--skip-question-bank"]) == 0

    assert "Upgraded 2 client(s): pytest_client_a, pytest_client_b" in capsys.readouterr().out


def test_upgrade_stops_at_the_first_failure(provisioned, tmp_path, capsys):
    for name in CLIENTS:
        (tmp_path / f"{name}.env").write_text((provisioned / f"{name}.env").read_text())
    broken = make_url(read_env(tmp_path / "pytest_client_a.env")["DATABASE_URL"]).set(password="wrong")
    (tmp_path / "pytest_client_a.env").write_text(
        f"DATABASE_URL={broken.render_as_string(hide_password=False)}\n"
    )

    assert upgrade_clients.main(["--clients-dir", str(tmp_path), "--skip-question-bank"]) == 1

    out = capsys.readouterr().out
    assert "Upgraded: none" in out
    assert "Not upgraded: pytest_client_a, pytest_client_b" in out
