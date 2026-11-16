# One container for the hosted demo: the built frontend, the API and PostgreSQL together.
# Inference runs in NumPy from the exported weights, so the image needs no TensorFlow
# and fits a 512 MB free instance. Saved predictions do not survive a restart.

FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends postgresql gosu \
    && apt-get clean
WORKDIR /app
COPY backend/requirements-serve.txt backend/requirements-serve.txt
RUN pip install -r backend/requirements-serve.txt
COPY backend/app backend/app
COPY backend/alembic backend/alembic
COPY backend/alembic.ini backend/alembic.ini
ARG MODEL_VERSION=20261029T043159Z-bd9e866c
COPY artifacts/${MODEL_VERSION}/metadata.json artifacts/${MODEL_VERSION}/model.keras \
     artifacts/${MODEL_VERSION}/curves.json artifacts/${MODEL_VERSION}/inference_weights.npz \
     artifacts/${MODEL_VERSION}/inference_weights.json artifacts/${MODEL_VERSION}/
COPY --from=frontend /build/dist frontend/dist
COPY deploy/start.sh /usr/local/bin/neurocare-start
RUN chmod +x /usr/local/bin/neurocare-start
ENV MODEL_DIR=artifacts/${MODEL_VERSION} FRONTEND_DIST=/app/frontend/dist \
    INFERENCE_BACKEND=numpy APP_ENV=production PORT=10000
EXPOSE 10000
CMD ["neurocare-start"]
