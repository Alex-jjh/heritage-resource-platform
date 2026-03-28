#!/bin/bash
# =============================================================================
# Alibaba Cloud ECS Setup Script
# Heritage Resource Platform — Single-server deployment
# ECS: ecs.c9i.large (8 vCPU / 16GB RAM)
# =============================================================================

set -euo pipefail

echo "=== Heritage Platform ECS Setup ==="

# --- 1. System packages ---
echo "[1/7] Installing system packages..."
sudo apt update -qq
sudo apt install -y -qq openjdk-21-jdk mysql-server nginx curl git

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y -qq nodejs

echo "Java: $(java -version 2>&1 | head -1)"
echo "Node: $(node -v)"
echo "npm: $(npm -v)"
echo "Nginx: $(nginx -v 2>&1)"

# --- 2. MySQL setup ---
echo "[2/7] Configuring MySQL..."
sudo systemctl enable mysql
sudo systemctl start mysql

DB_PASSWORD="${DB_PASSWORD:-heritage123}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS heritage_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'heritage'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON heritage_db.* TO 'heritage'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
echo "MySQL database 'heritage_db' ready."

# --- 3. Create directories ---
echo "[3/7] Creating application directories..."
sudo mkdir -p /opt/heritage/uploads /opt/heritage/thumbnails /opt/heritage/app
sudo mkdir -p /var/www/heritage
sudo chown -R $USER:$USER /opt/heritage /var/www/heritage

# --- 4. Backend setup ---
echo "[4/7] Building and deploying backend..."
if [ -d "backend" ]; then
    cd backend
    ./mvnw clean package -DskipTests -q 2>/dev/null || mvn clean package -DskipTests -q
    cp target/heritage-platform-0.0.1-SNAPSHOT.jar /opt/heritage/app/
    cd ..
    echo "Backend JAR deployed."
else
    echo "WARNING: backend/ directory not found. Skipping backend build."
fi

# --- 5. Frontend setup ---
echo "[5/7] Building and deploying frontend..."
if [ -d "frontend" ]; then
    cd frontend
    npm install --silent
    npm run build
    cp -r .next/standalone/* /opt/heritage/app/frontend/ 2>/dev/null || true
    cp -r .next/static /opt/heritage/app/frontend/.next/static 2>/dev/null || true
    cp -r public /opt/heritage/app/frontend/public 2>/dev/null || true
    cd ..
    echo "Frontend built and deployed."
else
    echo "WARNING: frontend/ directory not found. Skipping frontend build."
fi

# --- 6. Nginx config ---
echo "[6/7] Configuring Nginx..."
sudo cp scripts/nginx-heritage.conf /etc/nginx/sites-available/heritage
sudo ln -sf /etc/nginx/sites-available/heritage /etc/nginx/sites-enabled/heritage
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
echo "Nginx configured."

# --- 7. Systemd services ---
echo "[7/7] Creating systemd services..."

# Backend service
sudo tee /etc/systemd/system/heritage-backend.service > /dev/null <<EOF
[Unit]
Description=Heritage Platform Backend (Spring Boot)
After=mysql.service
Requires=mysql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/heritage/app
ExecStart=/usr/bin/java -jar heritage-platform-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
Environment=DB_PASSWORD=${DB_PASSWORD}
Environment=JWT_SECRET=${JWT_SECRET:-production-secret-change-me-must-be-at-least-256-bits-long!!}
Environment=FRONTEND_ORIGIN=${FRONTEND_ORIGIN:-http://localhost}
Environment=STORAGE_BASE_URL=${STORAGE_BASE_URL:-}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/heritage-frontend.service > /dev/null <<EOF
[Unit]
Description=Heritage Platform Frontend (Next.js)
After=heritage-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/heritage/app/frontend
ExecStart=/usr/bin/node server.js
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable heritage-backend heritage-frontend
sudo systemctl start heritage-backend
sleep 5
sudo systemctl start heritage-frontend

echo ""
echo "=== Setup Complete ==="
echo "Backend:  http://localhost:8080 (Spring Boot)"
echo "Frontend: http://localhost:3000 (Next.js)"
echo "Nginx:    http://localhost:80   (reverse proxy)"
echo "Swagger:  http://localhost/swagger-ui.html"
echo ""
echo "Check status:"
echo "  sudo systemctl status heritage-backend"
echo "  sudo systemctl status heritage-frontend"
echo "  sudo systemctl status nginx"
