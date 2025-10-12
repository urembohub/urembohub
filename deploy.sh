#!/bin/bash

# Deployment script for backend with volume persistence
echo "🚀 Starting backend deployment..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ./uploads
mkdir -p ./logs
mkdir -p ./prisma

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 ./uploads
chmod 755 ./logs
chmod 755 ./prisma

# Stop existing container
echo "🛑 Stopping existing container..."
docker-compose -f docker-compose.prod.yml down

# Remove old image (optional - uncomment if you want to force rebuild)
# echo "🗑️ Removing old image..."
# docker rmi $(docker images -q backend-backend) || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 10

# Check if service is running
echo "🔍 Checking service status..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Backend deployed successfully!"
    echo "📊 Service status:"
    docker-compose -f docker-compose.prod.yml ps
else
    echo "❌ Deployment failed!"
    echo "📋 Service logs:"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "🎉 Deployment complete!"
