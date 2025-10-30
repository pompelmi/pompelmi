# --- build stage
FROM node:22-alpine@sha256:b2358485e3e33bc3a33114d2b1bdb18cdbe4df01bd2b257198eb51beb1f026c5 AS build
WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate \
 && pnpm install --no-frozen-lockfile \
 && pnpm run build \
 && pnpm prune --prod

# --- runtime stage
FROM node:22-alpine@sha256:b2358485e3e33bc3a33114d2b1bdb18cdbe4df01bd2b257198eb51beb1f026c5
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 8787
ENV PORT=8787 HOST=0.0.0.0
CMD ["node", "dist/index.cjs"]
