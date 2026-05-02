# Production: CRA bundle + Express + Socket.IO on one PORT (WebView-safe same-origin).
FROM node:20-bookworm-slim AS cra

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
RUN npm run build

FROM node:20-bookworm-slim AS run

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# CRA output at repo-root `build`; server resolves ../build from backend/.
WORKDIR /app
COPY --from=cra /src/build ./build

WORKDIR /app/backend

ENV NODE_ENV=production

EXPOSE 10000
ENV PORT=10000

CMD ["node", "server.js"]
