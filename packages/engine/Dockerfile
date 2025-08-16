# --- build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm i -g pnpm
RUN pnpm install --prefer-offline
RUN pnpm run build

# --- runtime
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
EXPOSE 8787
ENV PORT=8787 HOST=0.0.0.0
CMD ["node", "dist/index.cjs"]
