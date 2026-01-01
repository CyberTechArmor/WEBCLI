#!/bin/bash
#
# Claude Code Web Terminal - Installer Script
# https://github.com/CyberTechArmor/WEBCLI
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | bash
#
# Or with API key:
#   curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | ANTHROPIC_API_KEY=sk-ant-... bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/CyberTechArmor/WEBCLI.git"
INSTALL_DIR="${INSTALL_DIR:-$HOME/claude-code-web}"
PORT="${PORT:-3210}"

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Claude Code Web Terminal Installer              ║"
echo "║                 https://github.com/CyberTechArmor/WEBCLI  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for required commands
check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"

    local missing=()

    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        missing+=("docker-compose")
    fi

    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required tools: ${missing[*]}${NC}"
        echo ""
        echo "Please install the missing tools and try again."
        echo ""
        echo "Docker installation: https://docs.docker.com/get-docker/"
        echo "Git installation: https://git-scm.com/downloads"
        exit 1
    fi

    echo -e "${GREEN}All requirements satisfied.${NC}"
}

# Check if Docker daemon is running
check_docker() {
    echo -e "${BLUE}Checking Docker daemon...${NC}"

    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running.${NC}"
        echo "Please start Docker and try again."
        exit 1
    fi

    echo -e "${GREEN}Docker is running.${NC}"
}

# Clone or update repository
setup_repository() {
    echo -e "${BLUE}Setting up repository...${NC}"

    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}Directory $INSTALL_DIR already exists.${NC}"
        read -p "Do you want to update it? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Updating repository..."
            cd "$INSTALL_DIR"
            git pull origin main || git pull origin master || true
        else
            echo "Using existing installation."
            cd "$INSTALL_DIR"
        fi
    else
        echo "Cloning repository to $INSTALL_DIR..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    echo -e "${GREEN}Repository ready.${NC}"
}

# Create .env file if API key is provided
setup_env() {
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo -e "${BLUE}Setting up environment...${NC}"
        echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" > "$INSTALL_DIR/.env"
        echo -e "${GREEN}API key configured.${NC}"
    else
        echo -e "${YELLOW}No API key provided. You can set it in the web UI settings.${NC}"
    fi
}

# Build and start containers
start_containers() {
    echo -e "${BLUE}Building and starting containers...${NC}"
    echo "This may take a few minutes on first run..."

    cd "$INSTALL_DIR"

    # Use docker compose or docker-compose depending on what's available
    if docker compose version &> /dev/null 2>&1; then
        docker compose up --build -d
    else
        docker-compose up --build -d
    fi

    echo -e "${GREEN}Containers started successfully.${NC}"
}

# Wait for service to be ready
wait_for_service() {
    echo -e "${BLUE}Waiting for service to be ready...${NC}"

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$PORT/api/health" &> /dev/null; then
            echo -e "${GREEN}Service is ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    echo -e "${YELLOW}Service may still be starting. Check logs with:${NC}"
    echo "  cd $INSTALL_DIR && docker-compose logs -f"
}

# Print success message
print_success() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Installation Complete!                          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Open your browser to: ${BLUE}http://localhost:$PORT${NC}"
    echo ""
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo -e "${YELLOW}Don't forget to configure your API key in Settings!${NC}"
        echo ""
    fi
    echo "Useful commands:"
    echo "  cd $INSTALL_DIR"
    echo ""
    echo "  # View logs"
    echo "  docker-compose logs -f"
    echo ""
    echo "  # Stop the service"
    echo "  docker-compose down"
    echo ""
    echo "  # Restart the service"
    echo "  docker-compose restart"
    echo ""
    echo "  # Update to latest version"
    echo "  git pull && docker-compose up --build -d"
    echo ""
}

# Main installation flow
main() {
    check_requirements
    check_docker
    setup_repository
    setup_env
    start_containers
    wait_for_service
    print_success
}

# Run main function
main
