# Bull Board Queue Monitoring

This implementation provides comprehensive monitoring for the BullMQ queue system using Bull Board.

## Features

### 🎯 **Queue Monitoring**
- Real-time queue statistics (waiting, active, completed, failed jobs)
- Queue health status monitoring
- Visual dashboard with auto-refresh

### 🎛️ **Queue Management**
- Pause/Resume queues
- Clear queue contents
- Queue performance metrics

### 📊 **Dashboard Access**
- **Bull Board UI**: `http://localhost:3000/admin/queues`
- **Custom Dashboard**: `http://localhost:3000/api/admin/queues/dashboard`
- **API Endpoints**: `http://localhost:3000/api/admin/queues/*`

## API Endpoints

### Queue Statistics
```bash
GET /api/admin/queues/stats
```
Returns detailed statistics for all queues.

### Queue Health
```bash
GET /api/admin/queues/health
```
Returns health status of all queues.

### Queue Management
```bash
POST /api/admin/queues/{queueName}/pause
POST /api/admin/queues/{queueName}/resume
POST /api/admin/queues/{queueName}/clear
```

## Queue Types

### 1. **Commission Reconciliation Queue**
- **Purpose**: Automated reconciliation of pending commissions
- **Frequency**: Every 30 minutes
- **Jobs**: `reconcile-commission`, `manual-reconcile-all`

### 2. **Commission Processing Queue**
- **Purpose**: Immediate commission status updates
- **Trigger**: When commissions are created
- **Jobs**: `process-commission`

## Usage

### Starting the System
```bash
# Start Redis
docker-compose up redis -d

# Start the backend
npm run start:dev
```

### Accessing the Dashboard
1. **Bull Board UI**: Navigate to `http://localhost:3000/admin/queues`
2. **Custom Dashboard**: Navigate to `http://localhost:3000/api/admin/queues/dashboard`

### Monitoring Commissions
- View real-time commission processing status
- Monitor reconciliation job progress
- Check for failed jobs and retry them
- Pause/resume queues during maintenance

## Configuration

### Environment Variables
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Queue Settings
- **Retry Attempts**: 3 attempts with exponential backoff
- **Job Retention**: 24 hours for completed, 7 days for failed
- **Auto-cleanup**: Enabled for both completed and failed jobs

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   ```bash
   # Check if Redis is running
   docker-compose ps redis
   
   # Start Redis if not running
   docker-compose up redis -d
   ```

2. **Queue Not Processing**
   - Check queue status in dashboard
   - Verify Redis connection
   - Check application logs for errors

3. **Dashboard Not Loading**
   - Ensure backend is running on port 3000
   - Check if Bull Board module is properly imported
   - Verify Redis is accessible

### Monitoring Commands
```bash
# Check Redis status
redis-cli ping

# Monitor Redis activity
redis-cli monitor

# Check queue contents
redis-cli keys "*queue*"
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NestJS App    │    │   Bull Board    │    │     Redis       │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Queues    │◄┼────┼─┤   Dashboard │ │    │ │   Queue     │ │
│ │             │ │    │ │             │ │    │ │   Storage   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The Bull Board implementation provides a complete monitoring solution for the commission system queues, ensuring reliable processing and easy management of background jobs.
