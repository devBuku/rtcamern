# Monolith: Vite frontend built and served by the Express API.
# Single runtime container. MongoDB is external (MongoDB Atlas), so no mongod
# is installed here — the app connects out to Atlas via MONGO_URI.

# ---------- Stage 1: build frontend ----------
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# Copy manifests first so dependency layers cache independently of source.
COPY frontend/package.json frontend/yarn.lock frontend/.yarnrc.yml ./
RUN yarn install --immutable
COPY frontend/ ./
# Vite inlines VITE_* at build time. An empty API URL means the client calls
# the API on its own origin (the monolith), so no CORS/absolute URL is needed.
ENV VITE_API_URL=
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN yarn build

# ---------- Stage 2: compile backend TypeScript ----------
FROM node:22-bookworm-slim AS backend-build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY backend/package.json backend/yarn.lock backend/.yarnrc.yml ./
RUN yarn install --immutable
COPY backend/ ./
RUN yarn build

# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
# Install production dependencies only (dev tools like tsc/tsx/prettier are omitted).
COPY backend/package.json backend/yarn.lock backend/.yarnrc.yml ./
RUN yarn workspaces focus --production && yarn cache clean

# Compiled backend JS -> /app/dist, built frontend assets -> /app/public.
COPY --from=backend-build  /app/dist          ./dist
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node

CMD ["node", "dist/index.js"]
