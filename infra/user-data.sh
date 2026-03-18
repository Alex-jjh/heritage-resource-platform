#!/bin/bash
set -euo pipefail
exec > /var/log/heritage-setup.log 2>&1

echo "=== Installing packages ==="
apt-get update -qq
apt-get install -y -qq openjdk-21-jdk-headless maven mysql-server git

echo "=== Configuring MySQL ==="
systemctl enable mysql
systemctl start mysql
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${db_password}';"
mysql -e "CREATE DATABASE IF NOT EXISTS heritage;"
mysql -e "FLUSH PRIVILEGES;"

echo "=== Cloning and building ==="
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/Alex-jjh/heritage-resource-platform.git
cd heritage-resource-platform/backend
sudo -u ubuntu mvn clean package -DskipTests -q

echo "=== Deploying ==="
mkdir -p /home/ubuntu/app
cp target/heritage-platform-0.0.1-SNAPSHOT.jar /home/ubuntu/app/
chown ubuntu:ubuntu /home/ubuntu/app/heritage-platform-0.0.1-SNAPSHOT.jar

cat > /home/ubuntu/app/heritage-backend.env << 'ENVEOF'
SPRING_PROFILES_ACTIVE=${spring_profile}
RDS_ENDPOINT=localhost
RDS_USERNAME=root
RDS_PASSWORD=${db_password}
AWS_REGION=${aws_region}
COGNITO_USER_POOL_ID=${cognito_user_pool_id}
COGNITO_CLIENT_ID=${cognito_client_id}
S3_BUCKET=${s3_bucket}
INTERNAL_API_KEY=${internal_api_key}
FRONTEND_ORIGIN=${frontend_origin}
ENVEOF
chmod 600 /home/ubuntu/app/heritage-backend.env
chown ubuntu:ubuntu /home/ubuntu/app/heritage-backend.env

cat > /etc/systemd/system/heritage-backend.service << 'SVCEOF'
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
SVCEOF

systemctl daemon-reload
systemctl enable heritage-backend
systemctl start heritage-backend

echo "=== Setup complete ==="
