# Multi-stage build for NestJS Backend with Prisma

# Stage 1: Dependencies
FROM node:18-alpine AS deps

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Copy Prisma schema and migrations
COPY prisma ./prisma/

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Generate Prisma Client in production image
RUN npx prisma generate

# Expose port (NestJS default is 3000)
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]