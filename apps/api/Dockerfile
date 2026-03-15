# ── Build stage ────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ffmpeg (needed for Subcis audio compilation)
RUN apk add --no-cache ffmpeg

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ffmpeg

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Temp directory for ffmpeg processing
RUN mkdir -p /tmp/youssouf

EXPOSE 3000

CMD ["node", "dist/index.js"]
