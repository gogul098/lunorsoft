# Production Dockerfile for Lunor AI Autonomous Agent Backend
FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose backend port
EXPOSE 8000

# Start production ASGI server with uvicorn
CMD ["sh", "-c", "uvicorn server:app --host ${HOST} --port ${PORT}"]
