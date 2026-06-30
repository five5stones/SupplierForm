FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/data/uploads

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data/uploads

EXPOSE 4000

CMD ["node", "./dist/server/entry.mjs"]
