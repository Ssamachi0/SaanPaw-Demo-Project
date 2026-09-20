# Build from the repository root (the backend is an npm workspace):
#   docker build -f backend/Dockerfile -t saanpaw-api .

FROM node:20-alpine AS build
WORKDIR /app
# Every workspace manifest is copied so the lockfile still matches; only the backend's dependencies get installed.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY mobile/package.json mobile/
COPY web/package.json web/
RUN npm ci --workspace backend --ignore-scripts
COPY backend backend
RUN npm run build --workspace backend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4001 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY mobile/package.json mobile/
COPY web/package.json web/
RUN npm ci --workspace backend --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
# Photos live outside the image; mount a volume here or they vanish on every deploy.
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
VOLUME /data/uploads
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "backend/dist/server.js"]
