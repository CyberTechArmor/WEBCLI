#!/bin/bash
#
# Claude Code Web Terminal - Installer Script
# https://github.com/CyberTechArmor/WEBCLI
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | bash
#
# Or with options (recommended for non-interactive install):
#   curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | \
#     DOMAIN=claude.example.com PORT=3210 bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh
#   chmod +x install.sh
#   ./install.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/CyberTechArmor/WEBCLI.git"
IMAGE_NAME="ghcr.io/cybertecharmor/webcli:latest"
INSTALL_DIR="${INSTALL_DIR:-$HOME/claude-code-web}"

# Check if we can read from terminal (for interactive prompts)
CAN_PROMPT=false
if [ -t 0 ]; then
    CAN_PROMPT=true
elif [ -e /dev/tty ]; then
    CAN_PROMPT=true
fi

# Function to read input (works with piped scripts)
read_input() {
    local prompt="$1"
    local default="$2"
    local result=""

    if [ "$CAN_PROMPT" = true ]; then
        if [ -t 0 ]; then
            read -p "$prompt" result
        else
            read -p "$prompt" result < /dev/tty
        fi
    fi

    echo "${result:-$default}"
}

# Function to read single character
read_char() {
    local prompt="$1"
    local result=""

    if [ "$CAN_PROMPT" = true ]; then
        if [ -t 0 ]; then
            read -p "$prompt" -n 1 -r result
            echo
        else
            read -p "$prompt" -n 1 -r result < /dev/tty
            echo
        fi
    else
        result="y"  # Default to yes for non-interactive
    fi

    echo "$result"
}

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           Claude Code Web Terminal Installer              ║"
    echo "║           https://github.com/CyberTechArmor/WEBCLI        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required tools: ${missing[*]}${NC}"
        echo ""
        echo "Please install the missing tools and try again."
        echo ""
        echo "Docker installation: https://docs.docker.com/get-docker/"
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

# Prompt for configuration
prompt_configuration() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    Configuration                          ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Domain configuration
    if [ -z "$DOMAIN" ]; then
        if [ "$CAN_PROMPT" = true ]; then
            echo -e "${YELLOW}Enter the domain or IP address for accessing the web interface.${NC}"
            echo -e "${YELLOW}Use 'localhost' for local access only, or your domain/IP for remote access.${NC}"
            echo ""
            DOMAIN=$(read_input "Domain [localhost]: " "localhost")
        else
            DOMAIN="localhost"
        fi
    fi
    echo -e "${GREEN}Domain: $DOMAIN${NC}"

    # Port configuration
    if [ -z "$PORT" ]; then
        if [ "$CAN_PROMPT" = true ]; then
            PORT=$(read_input "Port [3210]: " "3210")
        else
            PORT="3210"
        fi
    fi
    echo -e "${GREEN}Port: $PORT${NC}"

    # Installation directory
    if [ "$CAN_PROMPT" = true ] && [ -z "$INSTALL_DIR_SET" ]; then
        local new_dir=$(read_input "Install directory [$INSTALL_DIR]: " "$INSTALL_DIR")
        INSTALL_DIR="$new_dir"
    fi
    echo -e "${GREEN}Install directory: $INSTALL_DIR${NC}"

    echo ""
}

# Setup installation directory
setup_directory() {
    echo -e "${BLUE}Setting up installation directory...${NC}"

    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}Directory $INSTALL_DIR already exists.${NC}"
        local reply=$(read_char "Do you want to use existing installation? (Y/n) ")
        if [[ $reply =~ ^[Nn]$ ]]; then
            echo -e "${RED}Aborting installation.${NC}"
            exit 1
        fi
    else
        mkdir -p "$INSTALL_DIR"
    fi

    mkdir -p "$INSTALL_DIR/projects"

    echo -e "${GREEN}Directory ready: $INSTALL_DIR${NC}"
}

# Create docker-compose file
create_compose_file() {
    echo -e "${BLUE}Creating docker-compose configuration...${NC}"

    cat > "$INSTALL_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  claude-code-web:
    image: ${IMAGE_NAME}
    container_name: claude-code-web
    ports:
      - "${PORT}:3000"
    volumes:
      - claude-config:/home/claude/.claude
      - ./projects:/home/claude/projects
      - claude-anthropic:/home/claude/.anthropic
    environment:
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY:-}
      - NODE_ENV=production
      - TERM=xterm-256color
      - DOMAIN=${DOMAIN}
    restart: unless-stopped
    tty: true
    stdin_open: true

volumes:
  claude-config:
    name: claude-code-config
  claude-anthropic:
    name: claude-code-anthropic
EOF

    echo -e "${GREEN}Configuration created: $INSTALL_DIR/docker-compose.yml${NC}"
}

# Create .env file
create_env_file() {
    echo -e "${BLUE}Creating environment file...${NC}"

    cat > "$INSTALL_DIR/.env" << EOF
# Claude Code Web Terminal Configuration
# Generated by install.sh

# Domain for accessing the web interface
DOMAIN=${DOMAIN}

# Port for the web interface
PORT=${PORT}

# Anthropic API Key (optional - can be set in web UI)
# Uncomment and set your API key here, or configure it in the web interface
#ANTHROPIC_API_KEY=sk-ant-...
EOF

    echo -e "${GREEN}Environment file created: $INSTALL_DIR/.env${NC}"
}

# Pull the container image
pull_image() {
    echo -e "${BLUE}Pulling container image...${NC}"
    echo "This may take a few minutes on first run..."

    docker pull "$IMAGE_NAME"

    echo -e "${GREEN}Image pulled successfully.${NC}"
}

# Start containers
start_containers() {
    echo -e "${BLUE}Starting containers...${NC}"

    cd "$INSTALL_DIR"

    # Use docker compose or docker-compose depending on what's available
    if docker compose version &> /dev/null 2>&1; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    echo -e "${GREEN}Containers started successfully.${NC}"
}

# Wait for service to be ready
wait_for_service() {
    echo -e "${BLUE}Waiting for service to be ready...${NC}"

    local max_attempts=30
    local attempt=1
    local url="http://localhost:$PORT/api/health"

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" &> /dev/null; then
            echo ""
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
    local access_url
    if [ "$DOMAIN" = "localhost" ]; then
        access_url="http://localhost:$PORT"
    else
        access_url="http://$DOMAIN:$PORT"
    fi

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Installation Complete!                          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Access the web interface at: ${BLUE}${access_url}${NC}"
    echo ""
    echo -e "${YELLOW}Configure your Anthropic API key in the Settings menu (gear icon).${NC}"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    Useful Commands                        ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
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
    echo "  docker-compose pull && docker-compose up -d"
    echo ""
    if [ "$DOMAIN" != "localhost" ]; then
        echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${CYAN}                  HTTPS Configuration                      ${NC}"
        echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "  For production use with nginx, add this to your server config:"
        echo ""
        echo "  location / {"
        echo "      proxy_pass http://localhost:${PORT};"
        echo "      proxy_http_version 1.1;"
        echo "      proxy_set_header Upgrade \$http_upgrade;"
        echo "      proxy_set_header Connection \"upgrade\";"
        echo "      proxy_set_header Host \$host;"
        echo "      proxy_set_header X-Real-IP \$remote_addr;"
        echo "  }"
        echo ""
    fi
}

# Main installation flow
main() {
    print_banner
    check_requirements
    check_docker
    prompt_configuration
    setup_directory
    create_compose_file
    create_env_file
    pull_image
    start_containers
    wait_for_service
    print_success
}

# Run main function
main
