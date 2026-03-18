#!/bin/bash
# Lightsail instance initial setup script
# Run this once after creating the Lightsail instance
# Usage: ssh into instance, then: bash lightsail-setup.sh

set -e

echo "=== Installing Java 21 ==="
sudo apt-get update
sudo apt-get install -y openjdk-21-jre-headless

echo "=== Installing MySQL 8 ==="
sudo apt-get install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

echo "=== Creating database ==="
sudo mysql -e "CREATE DATABASE IF NOT EXISTS heritage;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'heritage_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_TO_SECURE_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON heritage.* TO 'heritage_app'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "=== Creating app directory ==="
mkdir -p /home/ubuntu/app

echo "=== Creating environment file ==="
cat > /home/ubuntu/app/heritage-backend.env << 'EOF'
# Spring profile
SPRING_PROFILES_ACTIVE=prod

# Database
RDS_ENDPOINT=localhost
RDS_USERNAME=heritage_app
RDS_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD

# AWS
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXX
S3_BUCKET=heritage-resources-prod

# Security
INTERNAL_API_KEY=CHANGE_ME_TO_RANDOM_STRING
FRONTEND_ORIGIN=https://your-frontend-domain.com
EOF

echo "=== Creating systemd service ==="
sudo tee /etc/systemd/system/heritage-backend.service > /dev/null << 'EOF'
[Unit]
Description=Heritage Platform Backend
After=network.target mysql.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app
EnvironmentFile=/home/ubuntu/app/heritage-backend.env
ExecStart=/usr/bin/java -jar /home/ubuntu/app/heritage-platform-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable heritage-backend

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Edit /home/ubuntu/app/heritage-backend.env with your real values"
echo "2. Upload the JAR file to /home/ubuntu/app/"
echo "3. Run: sudo systemctl start heritage-backend"
echo "4. Check logs: journalctl -u heritage-backend -f"
