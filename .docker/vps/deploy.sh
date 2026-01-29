#!/bin/bash
# MadisBoard VPS Deployment Script
# Deploys to VPS using SSH with shared infrastructure
#
# Usage: ./deploy.sh [deploy|logs|backup|update|status|ssh]

set -e

# ===========================================
# Configuration - Hostinger VPS
# ===========================================
VPS_HOST="147.79.115.54"
VPS_USER="root"
VPS_PATH="/opt/madisboard"
SSH_KEY="./ssh/madisboard_deploy"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# SSH command helper
ssh_cmd() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_HOST" "$@"
}

# SCP helper
scp_cmd() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$@"
}

# Check SSH key exists
check_ssh() {
    if [ ! -f "$SSH_KEY" ]; then
        log_error "SSH key not found: $SSH_KEY"
        log_info "Generate one with: ssh-keygen -t ed25519 -f $SSH_KEY"
        exit 1
    fi
}

# Show public key for adding to VPS
show_pubkey() {
    if [ -f "${SSH_KEY}.pub" ]; then
        log_info "Add this public key to your VPS authorized_keys:"
        echo ""
        cat "${SSH_KEY}.pub"
        echo ""
        log_info "On VPS: echo '<key>' >> ~/.ssh/authorized_keys"
    fi
}

# Deploy to VPS
deploy() {
    check_ssh
    log_info "Deploying MadisBoard to $VPS_HOST..."

    log_step "Creating directory on VPS..."
    ssh_cmd "mkdir -p $VPS_PATH"

    log_step "Copying files..."
    scp_cmd docker-compose.yml "$VPS_USER@$VPS_HOST:$VPS_PATH/"
    scp_cmd .env.example "$VPS_USER@$VPS_HOST:$VPS_PATH/"

    log_step "Setting up .env if not exists..."
    ssh_cmd "cd $VPS_PATH && [ ! -f .env ] && cp .env.example .env || true"

    log_step "Pulling latest images..."
    ssh_cmd "cd $VPS_PATH && docker compose pull"

    log_step "Starting services..."
    ssh_cmd "cd $VPS_PATH && docker compose up -d"

    log_info "Deployment complete!"
    log_info "Access at: https://board.madis-labs.com"
}

# Show logs
logs() {
    check_ssh
    ssh_cmd "cd $VPS_PATH && docker compose logs -f --tail=100"
}

# Backup database
backup() {
    check_ssh
    log_info "Creating backup on VPS..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    ssh_cmd "cd $VPS_PATH && mkdir -p backups && \
        docker exec shared-postgres pg_dump -U postgres madisboard | gzip > backups/madisboard_${TIMESTAMP}.sql.gz && \
        ls -la backups/"

    log_info "Backup created on VPS"
}

# Update deployment
update() {
    check_ssh
    log_info "Updating MadisBoard on VPS..."

    log_step "Creating backup first..."
    backup

    log_step "Pulling latest images..."
    ssh_cmd "cd $VPS_PATH && docker compose pull"

    log_step "Recreating containers..."
    ssh_cmd "cd $VPS_PATH && docker compose up -d --force-recreate"

    log_info "Update complete!"
}

# Show status
status() {
    check_ssh
    log_info "MadisBoard status on VPS:"
    ssh_cmd "cd $VPS_PATH && docker compose ps"
}

# Interactive SSH
connect() {
    check_ssh
    log_info "Connecting to VPS..."
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST"
}

# Stop services
stop() {
    check_ssh
    log_info "Stopping MadisBoard..."
    ssh_cmd "cd $VPS_PATH && docker compose down"
    log_info "Stopped."
}

# Restart services
restart() {
    check_ssh
    log_info "Restarting MadisBoard..."
    ssh_cmd "cd $VPS_PATH && docker compose restart"
    log_info "Restarted."
}

# Main
case "${1:-}" in
    deploy)
        deploy
        ;;
    logs)
        logs
        ;;
    backup)
        backup
        ;;
    update)
        update
        ;;
    status)
        status
        ;;
    ssh|connect)
        connect
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    pubkey|key)
        show_pubkey
        ;;
    *)
        echo "MadisBoard VPS Deployment"
        echo ""
        echo "Usage: $0 {deploy|logs|backup|update|status|ssh|stop|restart|pubkey}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy/update MadisBoard to VPS"
        echo "  logs     - Show live logs from VPS"
        echo "  backup   - Create database backup on VPS"
        echo "  update   - Update to latest version"
        echo "  status   - Show container status"
        echo "  ssh      - Connect to VPS interactively"
        echo "  stop     - Stop MadisBoard on VPS"
        echo "  restart  - Restart MadisBoard on VPS"
        echo "  pubkey   - Show SSH public key to add to VPS"
        echo ""
        echo "Configuration:"
        echo "  VPS_HOST: $VPS_HOST"
        echo "  VPS_USER: $VPS_USER"
        echo "  VPS_PATH: $VPS_PATH"
        echo "  SSH_KEY:  $SSH_KEY"
        exit 1
        ;;
esac
