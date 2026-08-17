# syntax=docker/dockerfile:1

# Imagen multi-target para el monorepo pnpm (backend NestJS + frontend Vue/Vite).
# Contexto de build = raíz del repo (necesario: pnpm hoistea a node_modules/.pnpm).
# Targets: backend (NestJS runtime) y frontend (nginx static SPA).

#############################
# base: instala dependencias del workspace (cacheable por lockfile)
#############################
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN pnpm install --frozen-lockfile

#############################
# build: compila backend y frontend
#############################
FROM base AS build
COPY apps apps
RUN pnpm --filter backend build \
 && pnpm --filter frontend build \
 && pnpm --filter backend deploy --legacy --prod /out/backend

#############################
# backend: NestJS runtime
#############################
FROM node:22-slim AS backend
ENV NODE_ENV=production PORT=3100
WORKDIR /app
COPY --from=build /out/backend/package.json ./package.json
COPY --from=build /out/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
EXPOSE 3100
CMD ["node", "dist/main"]

#############################
# frontend: nginx sirviendo el SPA estático + proxy /api
#############################
FROM nginx:1.27-alpine AS frontend
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80