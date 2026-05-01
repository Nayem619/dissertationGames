# Production web (Expo static export + scripts/render-serve.js).
# Render start command MUST be node scripts/render-serve.js (see CMD below). Do NOT run
# `node expo-router/entry`; package.json main is for Expo/Metro bundler only.
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env (EXPO_PUBLIC_*) comes from Render / your host automatically.
RUN npm run export:web

ENV NODE_ENV=production

# Render sets PORT at runtime — see scripts/render-serve.js
CMD ["node", "scripts/render-serve.js"]
