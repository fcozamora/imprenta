# ---------- Etapa 1: compilar las pantallas ----------
FROM node:22-slim AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Etapa 2: compilar el servidor ----------
FROM node:22-slim AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---------- Etapa 3: la imagen que se va a ejecutar ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Solo las dependencias de produccion: la imagen queda mucho mas liviana
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend  /app/dist ./dist
COPY --from=frontend /app/dist ./public

RUN mkdir -p /app/almacen/muestras

EXPOSE 3000
CMD ["node", "dist/server.js"]
