FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html finance-reference.html vite.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    DB_PATH=/data/clinic.db \
    UPLOADS_PATH=/data/uploads
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ tini && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npx playwright install --with-deps chromium \
    && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
COPY public/cima ./public/cima
RUN mkdir -p /data/uploads
EXPOSE 3001
ENTRYPOINT ["tini", "--"]
CMD ["npm", "start"]
