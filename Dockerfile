# Production web (Expo static export + scripts/render-serve.js).
# Render "Native Node" often runs `node expo-router/entry` from package.json "main";
# Expo sets main to resolve via node_modules — not a filesystem path → crash.
# Docker uses CMD below so startup is always correct.
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
