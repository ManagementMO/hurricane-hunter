# 🌪️ Hurricane Hunter Deployment Guide

## Production URLs
- **Frontend**: https://hurricane-hunter.vercel.app/
- **Backend**: https://hurricane-hunter-backend.vercel.app/

## Backend Configuration ✅

### CORS Settings
The backend now accepts requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5174` (Vite alt port)
- `http://localhost:3000` (React/Next.js dev)
- `https://hurricane-hunter.vercel.app` (Production frontend)
- `https://hurricane-hunter-backend.vercel.app` (Backend itself)

### API Endpoints
- Health check: `https://hurricane-hunter-backend.vercel.app/health`
- Balloons: `https://hurricane-hunter-backend.vercel.app/api/balloons/history`
- Storms: `https://hurricane-hunter-backend.vercel.app/api/storms`

## Frontend Configuration ✅

### Environment-Based API URLs
The frontend automatically detects environment:
- **Development**: Uses `http://localhost:8000`
- **Production**: Uses `https://hurricane-hunter-backend.vercel.app`

### API Configuration
Located in `/src/config.js`:
```javascript
export const API_ENDPOINTS = {
  balloons: '${API_BASE_URL}/api/balloons/history',
  storms: '${API_BASE_URL}/api/storms',
  health: '${API_BASE_URL}/health'
};
```

## Docker Files Created 📦

### Dockerfile
- Python 3.11 slim base image
- Non-root user for security
- Built-in health checks
- Optimized for production

### .dockerignore
- Excludes frontend, git, cache files
- Keeps image size minimal
- Protects sensitive files

### docker-compose.yml
- Single service setup
- Health monitoring
- Auto-restart policies
- Network isolation

### deploy.sh
- Automated deployment script
- Health checking and monitoring
- Container management

## Development vs Production

### Development (localhost:5173)
```bash
npm run dev
# Uses http://localhost:8000 for API calls
```

### Production (Vercel)
```bash
npm run build
# Uses https://hurricane-hunter-backend.vercel.app for API calls
```

## Testing API Connectivity

The app includes built-in API testing utilities:
- Logs environment info on startup
- Tests all endpoints automatically
- Falls back to demo data if backend unavailable
- Console logging for debugging

## Deployment Commands

### Local Docker
```bash
# Build and run
docker build -t hurricane-hunter-api .
docker run -p 8000:8000 hurricane-hunter-api

# Or use compose
docker-compose up -d

# Or use deploy script
chmod +x deploy.sh
./deploy.sh
```

### Frontend Build
```bash
cd hurricane-dashboard
npm run build
# Deploy dist/ folder to Vercel
```

## Security Features

- ✅ Non-root Docker user
- ✅ Specific CORS origins (no wildcards)
- ✅ Environment-based configuration
- ✅ Health checks and monitoring
- ✅ Minimal Docker image
- ✅ No sensitive data in containers

## Monitoring

- Health endpoint: `/health`
- Docker health checks every 30s
- Automatic container restart
- Console logging for debugging
- API connectivity testing

All systems are configured and ready for production! 🚀