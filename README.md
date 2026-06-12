# Backend Node.js API Setup (`mag_api`) - Server Production Guide

This directory houses the backend Express.js server, handling user authentication (JWT), telemetry streams, device pairing, and CMS administrative updates.

---

## 🚀 Installation & Deployment Steps

### 1. Install Node.js
Ensure Node.js ($18.x$ or $20.x$) is installed on the server.
```bash
# Verify installation
node -v
npm -v
```

### 2. Install Dependencies
Navigate to this directory and install only production dependencies:
```bash
npm install --omit=dev
```

### 3. Configure Environment Variables (`.env`)
Create a `.env` file in the root of `mag_api`:
```bash
touch .env
```
Add the following configuration variables (configure database credentials and strong secrets):
```env
NODE_ENV=production
PORT=4000

# Database Connection (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=mag_sql
DB_USER=mag_developer
DB_PASSWORD="your_production_password"

# Security Secrets (Use long, randomly generated strings)
JWT_SECRET="your_production_jwt_secret"
COOKIE_SECRET="your_production_cookie_secret"

# Device Telemetry Token (Secret shared between API and hardware sensors)
DEVICE_TOKEN_SECRET="your_secure_device_secret"
```

> [!IMPORTANT]
> **Database Password quotes:**
> If your MySQL password contains special characters (like `#` or `$`), you **must** wrap it in quotes (`"..."`) or the parser will cut off the password at the special character, causing connection failures.

---

## 🛡️ Production Security Policies
- **Test Token Disable:** When `NODE_ENV=production` is set, the debug/mock token (`'TEST_DEVICE_TOKEN'`) is automatically rejected. Only hardware sensors utilizing the real `DEVICE_TOKEN_SECRET` header can send telemetry.
- **CORS Config:** If the frontend and backend are hosted on different subdomains, configure the permitted origins in `src/app.js` under the `cors()` middleware.

---

## ⚙️ Running in Production using PM2

To ensure the backend server runs continuously in the background and restarts automatically if it crashes, use **PM2**:

1. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```

2. Start the API server:
   ```bash
   pm2 start server.js --name "magnetic-sensor-api"
   ```

3. Check process logs and status:
   ```bash
   pm2 logs
   pm2 status
   ```
