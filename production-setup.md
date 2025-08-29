# SMS Platform Production Setup Guide

## Requirements Met

### ✅ Core Infrastructure
- **PostgreSQL Database**: Full schema with tables for devices, campaigns, messages, contacts
- **TypeScript Backend**: Production-ready Express server with proper compilation
- **React Frontend**: Modern dashboard with device management and campaign creation
- **WebSocket Communication**: Real-time updates between server and clients

### ✅ Device Integration
- **Android ADB Integration**: USB-connected phones via Android Debug Bridge
- **React Native Bridge App**: WiFi-connected phones via custom mobile app
- **WebUSB SMS Modems**: Direct browser control of USB SMS modems
- **Device Discovery**: Automatic detection and connection of devices

### ✅ Security & Authentication
- **JWT Authentication**: Secure token-based authentication for users and devices
- **Device Registration**: Secure device pairing and token management
- **Rate Limiting**: Protection against authentication attacks
- **CORS Security**: Proper cross-origin resource sharing configuration

## Production Deployment Steps

### 1. Database Setup

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Create Database
```bash
sudo -u postgres psql
CREATE DATABASE sms_platform;
CREATE USER sms_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sms_platform TO sms_user;
\q
```

#### Run Schema Migration
```bash
cd backend
npm install
npm run build
node dist/database/migrations/001_initial_schema.js
```

### 2. Backend Server Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
```bash
cp ../.env.example .env
# Edit .env with production values:
# - Set secure JWT_SECRET
# - Configure database connection
# - Set production CORS origins
# - Configure logging paths
# - (Optional) Set admin bootstrap for first run
#   ADMIN_INIT_USERNAME=admin
#   ADMIN_INIT_PASSWORD=<one-time-strong-password>
```

#### Build and Start
```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start:prod
```

#### Admin Bootstrap (First Run)
- If the `users` table is empty and `ADMIN_INIT_PASSWORD` is set, logging in via `POST /api/auth/login` with `username=ADMIN_INIT_USERNAME` and `password=ADMIN_INIT_PASSWORD` creates the initial admin user and returns a JWT.
- After confirming the admin is created, remove `ADMIN_INIT_PASSWORD` from `.env` and create additional users via an admin UI/API (planned) or direct DB insert with bcrypt hash.
- Always set a strong, unique `JWT_SECRET` in `.env`.

#### Process Manager (PM2)
```bash
npm install -g pm2
pm2 start dist/server.js --name sms-platform
pm2 startup
pm2 save
```

### 3. Frontend Setup

#### Build React App
```bash
cd frontend
npm install
npm run build
```

#### Serve with Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/sms/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 4. Device Setup

#### Android USB Devices
1. Enable Developer Options on Android devices
2. Enable USB Debugging
3. Install ADB on server: `sudo apt install android-tools-adb`
4. Connect devices via USB and authorize debugging
5. Verify: `adb devices`

#### React Native Bridge App
1. Build APK: `cd mobile/react-native && npm run build-android`
2. Install on devices: `adb install android/app/build/outputs/apk/release/app-release.apk`
3. Configure server URL in app settings
4. Enable bridge service

#### USB SMS Modems
1. Install modems on client machines with browser access
2. Use WebUSB API for direct browser control
3. Supported modems: Huawei, ZTE, U-Blox, Quectel, Qualcomm

### 5. Security Hardening

#### SSL/TLS Certificate
```bash
# Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Firewall Configuration
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 4000  # Backend API (optional, can proxy through nginx)
```

#### Database Security
```bash
# Restrict PostgreSQL access
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Use md5 authentication for security
```

#### Additional Hardening
- CORS: Restrict origins via `.env` (comma-separated if multiple), e.g., `CORS_ORIGIN=https://your-dashboard.example.com`
- JWT Secret: Always set a strong `JWT_SECRET`.
- Rate Limiting: Login attempts are rate limited by default.
- Network: Run behind Nginx with TLS; restrict DB to localhost or private network only.
- Device Registration: For production, gate device registration behind an admin-controlled flow (e.g., issue pairing tokens). The `/api/auth/device/register` endpoint is open by default for development—harden this for production.
- Frontend Config: Set `REACT_APP_API_BASE_URL` and (optionally) `REACT_APP_SOCKET_URL` to your backend origin.

### 6. Monitoring & Logging

#### Log Rotation
```bash
sudo nano /etc/logrotate.d/sms-platform
```

```
/path/to/sms/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 sms-user sms-user
    postrotate
        pm2 reload sms-platform
    endscript
}
```

#### Health Monitoring
- Server health: `GET /api/health`
- Device status: Monitor WebSocket connections
- Database connectivity: Connection pool monitoring
- SMS delivery rates: Analytics dashboard

### 7. Backup Strategy

#### Database Backups
```bash
# Create backup script
cat > /usr/local/bin/backup-sms-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/sms-platform"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U sms_user sms_platform > $BACKUP_DIR/sms_platform_$DATE.sql
gzip $BACKUP_DIR/sms_platform_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sms-db.sh

# Add to crontab
echo "0 2 * * * /usr/local/bin/backup-sms-db.sh" | crontab -
```

## Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Web Dashboard     │    │   Mobile Devices    │    │   USB SMS Modems   │
│   (React Client)    │    │  (React Native)     │    │   (WebUSB API)      │
└──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
           │                          │                          │
           │ HTTP/WebSocket           │ HTTP/WebSocket           │ WebUSB
           │                          │                          │
           └─────────────┬────────────┴────────────┬─────────────┘
                         │                         │
                ┌────────▼─────────────────────────▼────────┐
                │           Backend Server                  │
                │     (Node.js + TypeScript)                │
                │                                           │
                │  ┌─────────────────────────────────────┐  │
                │  │         Device Manager              │  │
                │  │   - ADB Service (USB Android)      │  │
                │  │   - WebSocket Handler (WiFi)        │  │
                │  │   - WebUSB Service (USB Modems)     │  │
                │  └─────────────────────────────────────┘  │
                │                                           │
                │  ┌─────────────────────────────────────┐  │
                │  │         Campaign Manager            │  │
                │  │   - SMS Queue Processing            │  │
                │  │   - Drip Campaign Logic             │  │
                │  │   - Load Balancing                  │  │
                │  └─────────────────────────────────────┘  │
                │                                           │
                │  ┌─────────────────────────────────────┐  │
                │  │      Authentication & Security      │  │
                │  │   - JWT Token Management            │  │
                │  │   - Device Registration             │  │
                │  │   - Rate Limiting                   │  │
                │  └─────────────────────────────────────┘  │
                └───────────────────┬───────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │   PostgreSQL       │
                          │     Database       │
                          │                    │
                          │ - Devices          │
                          │ - Campaigns        │
                          │ - Messages         │
                          │ - Contacts         │
                          │ - Device Logs      │
                          └────────────────────┘
```

## Key Features Implemented

### 🔌 Multi-Device Support
- **USB Android Phones**: Direct ADB control via USB connection
- **WiFi Android/iOS Phones**: React Native bridge app for wireless control
- **USB SMS Modems**: WebUSB integration for direct browser control

### 📱 Campaign Management
- **Bulk SMS Campaigns**: Upload CSV contacts, personalized messaging
- **Drip Campaigns**: Scheduled message sequences with time delays
- **Load Balancing**: Automatic distribution across available devices
- **Real-time Monitoring**: Live campaign progress and delivery status

### 🔐 Security Features
- **JWT Authentication**: Secure user and device authentication
- **Device Registration**: Secure pairing of physical devices
- **Rate Limiting**: Protection against abuse and spam
- **CORS Security**: Proper cross-origin request handling

### 📊 Analytics & Monitoring
- **Real-time Dashboard**: Device status, campaign progress, delivery rates
- **Message Logging**: Complete audit trail of all SMS activities
- **Device Health**: Battery, signal strength, SIM status monitoring
- **Performance Metrics**: Delivery rates, error tracking, queue management

## Troubleshooting Common Issues

### Device Connection Problems
1. **ADB Device Not Found**
   - Check USB drivers installation
   - Verify USB debugging is enabled
   - Try different USB cable/port
   - Restart ADB: `adb kill-server && adb start-server`

2. **React Native App Connection Failed**
   - Verify server URL is correct and accessible
   - Check network connectivity
   - Ensure app has required permissions

3. **WebUSB Modem Not Detected**
   - Verify browser supports WebUSB (Chrome/Edge)
   - Check if modem is supported vendor
   - Install modem drivers if needed

### Database Issues
1. **Migration Failures**
   - Check database connection credentials
   - Verify PostgreSQL service is running
   - Ensure user has proper permissions

2. **Performance Issues**
   - Monitor connection pool usage
   - Check for long-running queries
   - Consider database indexing optimization

### SMS Delivery Problems
1. **Messages Not Sending**
   - Check device SIM status and signal strength
   - Verify device is online and available
   - Check message queue for errors

2. **Rate Limiting Issues**
   - Adjust SMS rate limits in configuration
   - Distribute load across more devices
   - Monitor carrier restrictions

This production setup provides a complete, scalable SMS platform capable of handling large-scale drip campaigns using physical devices instead of third-party services.
