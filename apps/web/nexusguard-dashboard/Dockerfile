FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle at build time (Next.js only exposes NEXT_PUBLIC_* vars to the
# browser by inlining them during `next build`) - it has to be the public API URL the
# player/admin's browser will actually reach, not a Docker-internal service name.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# output: "standalone" (next.config.ts) traces the minimal server + node_modules subset needed
# at runtime - static assets and public/ (including the scanner .exe download) aren't part of
# that trace by design, so they're copied in separately.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
