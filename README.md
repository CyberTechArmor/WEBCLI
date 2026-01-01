# Claude Code Web Terminal

A self-hosted web interface for Claude Code CLI that provides browser-based access to Claude Code with all its advantages (MCP, hooks, context, permissions) through a simple chat interface.

## Features

- **Web-based Chat Interface**: Access Claude Code through a modern chat UI in your browser
- **Real-time Streaming**: Watch Claude's responses stream in real-time via WebSocket
- **Tool Visualization**: See tool usage (Read, Write, Bash, etc.) displayed as inline badges
- **Thinking Blocks**: Collapsible thinking blocks to see Claude's reasoning
- **Permission Handling**: Accept or reject permission requests directly in the UI
- **Session Management**: Start, stop, and manage Claude Code sessions
- **Docker-based**: Easy deployment with pre-built container images
- **Persistent Configuration**: Settings and Claude Code config survive container restarts

## Quick Start

### One-Line Install

The installer will prompt you for your domain and port, then pull the pre-built container:

```bash
curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | bash
```

Or with pre-configured options:

```bash
curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/WEBCLI/main/install.sh | \
  DOMAIN=claude.example.com PORT=3210 bash
```

The installer will:
1. Prompt for domain (e.g., `localhost` or `claude.example.com`)
2. Prompt for port (default: `3210`)
3. Pull the pre-built container from GitHub Container Registry
4. Start the service

**After installation, configure your API key in the web UI Settings (gear icon).**

### Docker Pull

Pull the container directly:

```bash
docker pull ghcr.io/cybertecharmor/webcli:latest
```

### Manual Installation

#### Prerequisites

- Docker and Docker Compose
- Anthropic API key

#### Using Pre-built Image

1. Create a directory and docker-compose.yml:
   ```bash
   mkdir claude-code-web && cd claude-code-web
   ```

2. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     claude-code-web:
       image: ghcr.io/cybertecharmor/webcli:latest
       container_name: claude-code-web
       ports:
         - "3210:3000"
       volumes:
         - claude-config:/home/claude/.claude
         - ./projects:/home/claude/projects
         - claude-anthropic:/home/claude/.anthropic
       environment:
         - DOMAIN=localhost
       restart: unless-stopped
       tty: true
       stdin_open: true

   volumes:
     claude-config:
     claude-anthropic:
   ```

3. Start the container:
   ```bash
   docker-compose up -d
   ```

4. Open your browser to `http://localhost:3210`

5. Click the settings icon and enter your Anthropic API key

#### Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/CyberTechArmor/WEBCLI.git
   cd WEBCLI
   ```

2. Build and start:
   ```bash
   docker-compose -f docker-compose.build.yml up --build -d
   ```

## Container Images

Pre-built images are available from GitHub Container Registry:

| Tag | Description |
|-----|-------------|
| `ghcr.io/cybertecharmor/webcli:latest` | Latest stable release |
| `ghcr.io/cybertecharmor/webcli:main` | Latest from main branch |
| `ghcr.io/cybertecharmor/webcli:vX.X.X` | Specific version |

Supported platforms: `linux/amd64`, `linux/arm64`

## Architecture

```
WEBCLI/
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Pre-built image configuration
├── docker-compose.build.yml    # Build from source configuration
├── install.sh                  # One-line installer script
├── .github/workflows/          # GitHub Actions for container builds
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── index.ts           # Express + WebSocket server
│   │   ├── session.ts         # Claude process management with node-pty
│   │   ├── parser.ts          # Output parsing for thinking, tools, etc.
│   │   ├── routes/
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── settings.ts    # Settings management
│   │   │   └── session.ts     # Session management
│   │   └── types.ts           # TypeScript types
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # UI components
│   │   ├── hooks/             # React hooks (useWebSocket, useSession)
│   │   └── store/             # Zustand state management
│   └── package.json
└── projects/                   # Working directory for projects (mounted volume)
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (can be set in UI) | (none) |
| `DOMAIN` | Domain/hostname for the web interface | localhost |
| `PORT` | External port mapping | 3210 |
| `NODE_ENV` | Environment | production |

### Port Mapping

| External | Internal | Description |
|----------|----------|-------------|
| 3210 | 3000 | Web interface |

### Volume Mounts

| Path | Description |
|------|-------------|
| `/home/claude/.claude` | Claude Code configuration |
| `/home/claude/.anthropic` | API credentials |
| `/home/claude/projects` | Working directory for projects |

## Management Commands

```bash
# Start the service
docker-compose up -d

# Stop the service
docker-compose down

# View logs
docker-compose logs -f

# Update to latest version
docker-compose pull && docker-compose up -d

# Restart the service
docker-compose restart
```

## API Endpoints

### Authentication

```
POST /api/auth
  Body: { apiKey: string }
  Response: { success: boolean, error?: string }

GET /api/auth
  Response: { authenticated: boolean }

DELETE /api/auth
  Response: { success: boolean }
```

### Settings

```
GET /api/settings
  Response: {
    authenticated: boolean,
    claudeVersion: string,
    defaultModel: string,
    mcpServers: string[],
    workingDirectory: string
  }

POST /api/settings
  Body: { defaultModel?: string, workingDirectory?: string }
  Response: { success: boolean, settings?: object }
```

### Session Management

```
POST /api/session/start
  Body: { workingDirectory?: string, model?: string }
  Response: { success: boolean, sessionId: string }

POST /api/session/:id/stop
  Response: { success: boolean }

GET /api/session/:id
  Response: { success: boolean, session: object }
```

## WebSocket Protocol

Connect to `/ws` for real-time communication.

### Client to Server Messages

```typescript
{ type: "message", sessionId: string, content: string }
{ type: "interrupt", sessionId: string }
{ type: "confirm", sessionId: string, response: "y" | "n" }
```

### Server to Client Messages

```typescript
{ type: "output", sessionId: string, content: string, streamType: "stdout" | "stderr" }
{ type: "thinking", sessionId: string, content: string }
{ type: "toolUse", sessionId: string, tool: string, status: "start" | "end" }
{ type: "permission", sessionId: string, request: string }
{ type: "sessionEnd", sessionId: string, exitCode: number }
{ type: "error", sessionId: string, message: string }
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/CyberTechArmor/WEBCLI.git
cd WEBCLI

# Build and run with docker-compose
docker-compose -f docker-compose.build.yml up --build -d
```

### Running Locally (without Docker)

1. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Start the backend:
   ```bash
   cd backend && npm run dev
   ```

3. Start the frontend (in another terminal):
   ```bash
   cd frontend && npm run dev
   ```

4. Open `http://localhost:5173`

## Troubleshooting

### Claude Code not found

```bash
docker exec -it claude-code-web claude --version
```

### WebSocket connection fails

```bash
curl http://localhost:3210/api/health
```

### Container won't start

```bash
docker-compose logs claude-code-web
```

## Security Considerations

- **API Key Storage**: API keys are stored in the container volume. Configure via the web UI for convenience, or use environment variables/secrets for production.
- **Network**: The container exposes port 3210. Use a reverse proxy (nginx, traefik, caddy) with SSL/TLS for production deployments.
- **Permissions**: Claude Code runs as a non-root user inside the container.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request at [https://github.com/CyberTechArmor/WEBCLI](https://github.com/CyberTechArmor/WEBCLI).
