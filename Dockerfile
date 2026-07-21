# 3 Stages

# ---- Stage 1: build ----------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first: this layer is cached unless dependencies change,
# so source edits don't trigger a full reinstall.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production dependencies ----------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Stage 3: runtime --------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# The node:alpine images ship a non-root `node` user (uid 1000).
COPY --chown=node:node --from=deps    /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist         ./dist
COPY --chown=node:node data                             ./data
COPY --chown=node:node package.json                     ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http/server.js"]