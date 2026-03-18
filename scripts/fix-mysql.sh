#!/bin/bash
set -euo pipefail

# Use debian-sys-maint to fix root auth
sudo mysql --defaults-file=/etc/mysql/debian.cnf <<'SQL'
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'HeritageDb2026!';
CREATE DATABASE IF NOT EXISTS heritage;
FLUSH PRIVILEGES;
SQL
echo "MySQL fixed!"

# Verify
mysql -u root -p'HeritageDb2026!' -e "SHOW DATABASES;"
echo "MySQL verified!"

# Check if repo exists, clone if not
if [ ! -d /home/ubuntu/heritage-resource-platform ]; then
  cd /home/ubuntu
  git clone https://github.com/Alex-jjh/heritage-resource-platform.git
fi

# Pull latest and build
cd /home/ubuntu/heritage-resource-platform
git pull origin main
cd backend
mvn clean package -DskipTests -q
echo "Build done!"

# Deploy
mkdir -p /home/ubuntu/app
cp target/heritage-platform-0.0.1-SNAPSHOT.jar /home/ubuntu/app/

cat > /home/ubuntu/app/heritage-backend.env <<'ENV'
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
chmod 600 /home/ubuntu/app/heritage-backend.env

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
echo "Service started! Waiting 20s..."
sleep 20
sudo systemctl status heritage-backend --no-pager || true
echo "=== ALL DONE ==="
