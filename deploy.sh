#!/bin/bash
# Hurricane Hunter API Deployment Script

set -e

echo "🌪️  Hurricane Hunter API Deployment"
echo "=================================="

# Build the Docker image
echo "Building Docker image..."
docker build -t hurricane-hunter-api .

# Stop and remove existing container if it exists
echo "Stopping existing container..."
docker stop hurricane-api 2>/dev/null || true
docker rm hurricane-api 2>/dev/null || true

# Run the new container
echo "Starting new container..."
docker run -d \
  --name hurricane-api \
  --restart unless-stopped \
  -p 8000:8000 \
  hurricane-hunter-api

# Wait for container to start
echo "Waiting for API to be ready..."
sleep 10

# Health check
echo "Performing health check..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is healthy and running on http://localhost:8000"
    echo "✅ Health endpoint: http://localhost:8000/health"
    echo "✅ Balloons API: http://localhost:8000/api/balloons/history"
    echo "✅ Storms API: http://localhost:8000/api/storms"
else
    echo "❌ Health check failed"
    echo "Container logs:"
    docker logs hurricane-api
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo "Monitor logs with: docker logs -f hurricane-api"