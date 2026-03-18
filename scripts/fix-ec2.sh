#!/bin/bash
set -euo pipefail

echo "=== Fixing MySQL ==="
sudo mysql <<'SQL'
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'HeritageDb2026!';
CREATE DATABASE IF NOT EXISTS heritage;
FLUSH PRIVILEGES;
SQL

echo "=== Cloning and building ==="
if [ ! -d /home/ubuntu/heritage-resource-platform ]; then
  cd /home/ubuntu
  git clone https://github.com/Alex-jjh/heritage-resource-platform.git
fi

cd /home/ubuntu/heritage-resource-platform/backend
git pull origin main
mvn clean package -DskipTests -q

echo "=== Deploying ==="
sudo mkdir -p /home/ubuntu/app
sudo cp target/heritage-platform-0.0.1-SNAPSHOT.jar /home/ubuntu/app/
sudo chown ubuntu:ubuntu /home/ubuntu/app/heritage-platform-0.0.1-SNAPSHOT.jar

sudo tee /home/ubuntu/app/heritage-backend.env > /dev/null <<'ENV'
SPRING_PROFILES_ACTIVE=prod
RDS_ENDPOINT=localhost
RDS_USERNAME=root
RDS_PASSWORD=HeritageDb2026!
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_9wstms0ZI
COGNITO_CLIENT_ID=125gtc5edmhdbbvteauqdhcta3
S3_BUCKET=heritage-resources-dev
INTERNAL_API_KEY=change-me-in-production
FRONTEND_ORIGIN=https://main.d39jebtelw5xqu.amplifyapp.com
ENV
sudo chmod 600 /home/ubuntu/app/heritage-backend.env
sudo chown ubuntu:ubuntu /home/ubuntu/app/heritage-backend.env

sudo tee /etc/systemd/system/heritage-backend.service > /dev/null <<'SVC'
[Unit]
Description=Heritage Platform Backend
After=network.target mysql.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/app
EnvironmentFile=/home/ubuntu/app/heritage-backend.env
ExecStart=/usr/bin/java -Xmx1g -jar /home/ubuntu/app/heritage-platform-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVC

sudo systemctl daemon-reload
sudo systemctl enable heritage-backend
sudo systemctl restart heritage-backend

echo "=== Done! Waiting 15s for startup ==="
sleep 15
sudo systemctl status heritage-backend --no-pager
