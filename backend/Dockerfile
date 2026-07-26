FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /srv
COPY backend/ backend/
RUN pip install --no-cache-dir ./backend
COPY --from=frontend /build/out frontend/out
COPY backend/docker_entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV DATA_DIR=/srv/data PYTHONPATH=/srv/backend
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
