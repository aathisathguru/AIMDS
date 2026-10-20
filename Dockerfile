# ==============================================================================
# AIMDS Backend — Production Dockerfile
# FastAPI + Uvicorn Python runtime for Railway deployment
# ==============================================================================

# Official Python 3.12 slim Debian Bookworm base image
FROM python:3.12-slim

# Prevent Python from writing .pyc files & keep stdout/stderr unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Container working directory
WORKDIR /app

# Install minimal system dependencies (curl for container health probes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python package dependencies
COPY backend/requirements.txt ./
RUN python -m pip install --no-cache-dir --upgrade pip && \
    python -m pip install --no-cache-dir -r requirements.txt

# Copy application source code into /app/app
COPY backend/app ./app

# Expose default HTTP port (informational)
EXPOSE 8000

# Start Uvicorn in foreground, binding to 0.0.0.0 and dynamically expanding Railway's $PORT
# 'exec' ensures Uvicorn runs as PID 1 to handle SIGTERM/SIGINT signals gracefully
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
