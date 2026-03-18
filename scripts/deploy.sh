#!/bin/bash
# Heritage Platform Backend - One-click deployment script
# Supports: Ubuntu/Debian, Amazon Linux/RHEL/CentOS, Alpine
# Usage: curl the repo and run, or: bash deploy.sh
#
# Options:
#   --db-password <password>   MySQL password (default: auto-generated)
#   --spring-profile <profile> Spring profile (default: local)
#   --skip-mysql               Skip MySQL installation (use external DB)
#   --help                     Show this help

set -euo pipefail

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Defaults ───
DB_PASSWORD=""
SPRING_PROFILE="local"
SKIP_MYSQL=false
APP_DIR="$HOME/app"
REPO_URL="https://github.com/Alex-jjh/heritage-resource-platform.git"
REPO_DIR="$HOME/heritage-resource-platform"
JAR_NAME="heritage-platform-0.0.1-SNAPSHOT.jar"
SERVICE_NAME="heritage-backend"

# ─── Parse args ───
while [[ $# -gt 0 ]]; do
  case $1 in
    --db-password)   DB_PASSWORD="$2"; shift 2 ;;
    --spring-profile) SPRING_PROFILE="$2"; shift 2 ;;
    --skip-mysql)    SKIP_MYSQL=true; shift ;;
    --help)
      head -10 "$0" | tail -8
      exit 0 ;;
    *) err "Unknown option: $1" ;;
  esac
done

# Auto-generate DB password if not provided
if [[ -z "$DB_PASSWORD" ]]; then
  DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
  warn "Auto-generated DB password: $DB_PASSWORD"
  warn "Save this somewhere safe!"
fi

# ─── Detect OS ───
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian)       echo "debian" ;;
      amzn|rhel|centos|fedora|rocky|alma) echo "rhel" ;;
      alpine)              echo "alpine" ;;
      *) err "Unsupported OS: $ID" ;;
    esac
  else
    err "Cannot detect OS. /etc/os-release not found."
  fi
}

OS_FAMILY=$(detect_os)
log "Detected OS family: $OS_FAMILY"

# ─── Install packages ───
install_packages() {
  log "Installing Java 21, Maven, Git..."
  case "$OS_FAMILY" in
    debian)
      sudo apt-get update -qq
      sudo apt-get install -y -qq openjdk-21-jdk-headless maven git curl
      if [[ "$SKIP_MYSQL" == false ]]; then
        sudo apt-get install -y -qq mysql-server
      fi
      ;;
    rhel)
      sudo yum install -y java-21-amazon-corretto-devel maven git curl
      if [[ "$SKIP_MYSQL" == false ]]; then
        sudo yum install -y mysql-server
      fi
      ;;
    alpine)
      sudo apk add --no-cache openjdk21-jre maven git curl bash
      if [[ "$SKIP_MYSQL" == false ]]; then
        sudo apk add --no-cache mysql mysql-client
      fi
      ;;
  esac
  log "Packages installed"
}

# ─── Setup MySQL ───
setup_mysql() {
  if [[ "$SKIP_MYSQL" == true ]]; then
    warn "Skipping MySQL setup (--skip-mysql)"
    return
  fi

  log "Setting up MySQL..."
  case "$OS_FAMILY" in
    debian)
      sudo systemctl enable mysql
      sudo systemctl start mysql
      ;;
    rhel)
      sudo systemctl enable mysqld
      sudo systemctl start mysqld
      ;;
    alpine)
      sudo rc-update add mysql default
      sudo rc-service mysql start
      ;;
  esac

  sudo mysql -e "CREATE DATABASE IF NOT EXISTS heritage;"
  sudo mysql -e "CREATE USER IF NOT EXISTS 'heritage_app'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
  sudo mysql -e "GRANT ALL PRIVILEGES ON heritage.* TO 'heritage_app'@'localhost';"
  sudo mysql -e "FLUSH PRIVILEGES;"
  log "MySQL configured (database: heritage, user: heritage_app)"
}

# ─── Clone and build ───
build_app() {
  log "Cloning repository..."
  if [ -d "$REPO_DIR" ]; then
    cd "$REPO_DIR" && git pull
  else
    git clone "$REPO_URL" "$REPO_DIR"
  fi

  log "Building backend JAR (this may take a few minutes)..."
  cd "$REPO_DIR/backend"
  mvn clean package -DskipTests -q

  mkdir -p "$APP_DIR"
  cp "target/$JAR_NAME" "$APP_DIR/"
  log "JAR built and copied to $APP_DIR/"
}

# ─── Create env file ───
create_env_file() {
  local ENV_FILE="$APP_DIR/heritage-backend.env"

  if [ -f "$ENV_FILE" ]; then
    warn "Environment file already exists, backing up to ${ENV_FILE}.bak"
    cp "$ENV_FILE" "${ENV_FILE}.bak"
  fi

  cat > "$ENV_FILE" << EOF
# Heritage Platform Backend Configuration
# Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

SPRING_PROFILES_ACTIVE=${SPRING_PROFILE}

# Database
RDS_ENDPOINT=localhost
RDS_USERNAME=heritage_app
RDS_PASSWORD=${DB_PASSWORD}

# AWS (fill these after running terraform apply)
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=placeholder
COGNITO_CLIENT_ID=placeholder
S3_BUCKET=placeholder

# Security
INTERNAL_API_KEY=$(openssl rand -hex 24)
FRONTEND_ORIGIN=http://localhost:3000
EOF

  chmod 600 "$ENV_FILE"
  log "Environment file created at $ENV_FILE"
}

# ─── Create systemd service ───
create_service() {
  # Check if systemd is available
  if ! command -v systemctl &> /dev/null; then
    warn "systemd not available, creating start/stop scripts instead"
    create_manual_scripts
    return
  fi

  log "Creating systemd service..."
  sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=Heritage Platform Backend
After=network.target mysql.service

[Service]
User=$(whoami)
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/heritage-backend.env
ExecStart=/usr/bin/java -jar ${APP_DIR}/${JAR_NAME}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable ${SERVICE_NAME}
  sudo systemctl start ${SERVICE_NAME}
  log "Service created and started"
}

# Fallback for non-systemd systems (Alpine, containers)
create_manual_scripts() {
  cat > "$APP_DIR/start.sh" << EOF
#!/bin/bash
set -a; source ${APP_DIR}/heritage-backend.env; set +a
nohup java -jar ${APP_DIR}/${JAR_NAME} > ${APP_DIR}/app.log 2>&1 &
echo \$! > ${APP_DIR}/app.pid
echo "Started with PID \$(cat ${APP_DIR}/app.pid)"
EOF

  cat > "$APP_DIR/stop.sh" << EOF
#!/bin/bash
if [ -f ${APP_DIR}/app.pid ]; then
  kill \$(cat ${APP_DIR}/app.pid) 2>/dev/null
  rm ${APP_DIR}/app.pid
  echo "Stopped"
else
  echo "No PID file found"
fi
EOF

  chmod +x "$APP_DIR/start.sh" "$APP_DIR/stop.sh"
  bash "$APP_DIR/start.sh"
  log "Start/stop scripts created in $APP_DIR/"
}

# ─── Health check ───
health_check() {
  log "Waiting for application to start..."
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -qE "200|401|403|404"; then
      log "Application is running on port 8080"
      return
    fi
    sleep 2
  done
  warn "Application may not have started yet. Check logs:"
  if command -v systemctl &> /dev/null; then
    echo "  journalctl -u ${SERVICE_NAME} -f"
  else
    echo "  tail -f ${APP_DIR}/app.log"
  fi
}

# ─── Main ───
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Heritage Platform - Backend Deployment  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

install_packages
setup_mysql
build_app
create_env_file
create_service
health_check

echo ""
log "Deployment complete!"
echo ""
echo "  App directory:  $APP_DIR"
echo "  Config file:    $APP_DIR/heritage-backend.env"
echo "  Spring profile: $SPRING_PROFILE"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/heritage-backend.env with real AWS values"
echo "  2. Restart: sudo systemctl restart ${SERVICE_NAME}"
echo "  3. Logs:    journalctl -u ${SERVICE_NAME} -f"
echo ""
