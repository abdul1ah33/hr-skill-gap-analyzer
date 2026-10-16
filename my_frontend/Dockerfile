# The proxy image: Caddy serving the built frontend (docs/deployment.md).
# One build works for every client: the app calls the API at the relative
# path /api, and Caddy sends /api on each client's domain to that client's
# backend (deploy/Caddyfile).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


FROM caddy:2

COPY --from=build /app/dist /srv/frontend
