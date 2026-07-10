# ---------- Etapa 1: build do frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Etapa 2: backend + frontend estático ----------
FROM node:20-alpine
WORKDIR /app

# Instala dependências do backend
COPY backend/package.json ./backend/
RUN cd backend && npm install --omit=dev

# Copia código do backend
COPY backend/ ./backend/

# Copia o build do frontend para dentro do projecto
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Garante as pastas de dados
RUN mkdir -p /app/database /app/uploads/images /app/uploads/documents /app/uploads/audio /app/uploads/avatars

ENV NODE_ENV=production
EXPOSE 4000

WORKDIR /app/backend
CMD ["node", "server.js"]
