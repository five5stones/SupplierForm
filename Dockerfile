FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=768
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_maxsockets=1

COPY package*.json ./
COPY . .

# Install and build in one step so Docker cache cannot reuse a broken node_modules layer.
RUN npm install --no-audit --fund=false --progress=false \
  && test -f node_modules/astro/astro.js \
  && node ./node_modules/astro/astro.js build \
  && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/data/uploads

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data/uploads

EXPOSE 4000

CMD ["node", "./dist/server/entry.mjs"]
