# One image for every client backend (docs/deployment.md).
# Build context is the repository root, because the app also imports the
# root ai/ package (app/core/paths.py):
#     docker build -f backend/Dockerfile -t hr-skill-gap-api .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai /srv/ai
COPY backend /srv/backend

RUN useradd --system --no-create-home app
USER app

EXPOSE 8000

# Behind the proxy, under /api (deploy/Caddyfile). --root-path keeps the
# prefix in redirects (e.g. /api/positions -> /api/positions/) and in /api/docs
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--root-path", "/api", "--proxy-headers", "--forwarded-allow-ips", "*"]
