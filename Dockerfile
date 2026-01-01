# Claude Code Web Terminal - Dockerfile
# Based on Debian 12 (Bookworm) slim

FROM debian:bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install required dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    ca-certificates \
    gnupg \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

# Create non-root user 'claude' with home directory
RUN useradd -m -s /bin/bash -d /home/claude claude

# Set working directory
WORKDIR /home/claude

# Create necessary directories
RUN mkdir -p /home/claude/.claude \
    /home/claude/.anthropic \
    /home/claude/projects \
    /home/claude/app

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Verify Claude Code installation
RUN claude --version || echo "Claude Code installed"

# Copy backend files
COPY --chown=claude:claude backend/package*.json /home/claude/app/backend/
WORKDIR /home/claude/app/backend
RUN npm install

# Copy backend source
COPY --chown=claude:claude backend/ /home/claude/app/backend/

# Build backend TypeScript
RUN npm run build

# Copy frontend files
COPY --chown=claude:claude frontend/package*.json /home/claude/app/frontend/
WORKDIR /home/claude/app/frontend
RUN npm install

# Copy frontend source and build
COPY --chown=claude:claude frontend/ /home/claude/app/frontend/
RUN npm run build

# Set working directory back to app
WORKDIR /home/claude/app

# Set ownership of all files to claude user
RUN chown -R claude:claude /home/claude

# Switch to non-root user
USER claude

# Set environment variables
ENV HOME=/home/claude
ENV SHELL=/bin/bash
ENV NODE_ENV=production
ENV TERM=xterm-256color

# Expose port for web interface
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the web server
CMD ["node", "backend/dist/index.js"]
