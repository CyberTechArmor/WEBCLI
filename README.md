# Claude Code Web Terminal

A self-hosted web interface for Claude Code CLI that provides browser-based access to Claude Code with all its advantages (MCP, hooks, context, permissions) through a simple chat interface.

## Features

- **Web-based Chat Interface**: Access Claude Code through a modern chat UI in your browser
- **Real-time Streaming**: Watch Claude's responses stream in real-time via WebSocket
- **Tool Visualization**: See tool usage (Read, Write, Bash, etc.) displayed as inline badges
- **Thinking Blocks**: Collapsible thinking blocks to see Claude's reasoning
- **Permission Handling**: Accept or reject permission requests directly in the UI
- **Session Management**: Start, stop, and manage Claude Code sessions
- **Docker-based**: Easy deployment with Docker Compose
- **Persistent Configuration**: Settings and Claude Code config survive container restarts

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Anthropic API key

### Running with Docker Compose

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd claude-code-web
   ```

2. Set your API key (optional - can also be set in UI):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Build and start the container:
   ```bash
   docker-compose up --build
   ```

4. Open your browser to `http://localhost:3000`

5. If you didn't set the API key via environment variable, click the settings icon and enter your API key

6. Start chatting with Claude Code!

## Architecture

```
claude-code-web/
├── Dockerfile              # Container definition
├── docker-compose.yml      # Docker Compose configuration
├── backend/                # Node.js/Express backend
│   ├── src/
│   │   ├── index.ts       # Express + WebSocket server
│   │   ├── session.ts     # Claude process management with node-pty
│   │   ├── parser.ts      # Output parsing for thinking, tools, etc.
│   │   ├── routes/
│   │   │   ├── auth.ts    # Authentication endpoints
│   │   │   ├── settings.ts # Settings management
│   │   │   └── session.ts # Session management
│   │   └── types.ts       # TypeScript types
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main app component
│   │   ├── components/    # UI components
│   │   │   ├── Header.tsx
│   │   │   ├── ChatThread.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── InputArea.tsx
│   │   │   └── SettingsModal.tsx
│   │   ├── hooks/         # React hooks
│   │   │   ├── useWebSocket.ts
│   │   │   └── useSession.ts
│   │   └── store/         # Zustand state management
│   │       └── index.ts
│   └── package.json
└── projects/               # Working directory for projects (mounted volume)
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

GET /api/sessions
  Response: { success: boolean, sessions: object[] }
```

### Projects

```
GET /api/projects
  Response: { success: boolean, projects: { name: string, path: string }[] }
```

## WebSocket Protocol

Connect to `/ws` for real-time communication.

### Client to Server Messages

```typescript
// Send a message to Claude
{ type: "message", sessionId: string, content: string }

// Interrupt Claude (send Escape)
{ type: "interrupt", sessionId: string }

// Respond to permission request
{ type: "confirm", sessionId: string, response: "y" | "n" }
```

### Server to Client Messages

```typescript
// Regular output
{ type: "output", sessionId: string, content: string, streamType: "stdout" | "stderr" }

// Thinking block
{ type: "thinking", sessionId: string, content: string }

// Tool usage
{ type: "toolUse", sessionId: string, tool: string, status: "start" | "end" }

// Permission request
{ type: "permission", sessionId: string, request: string }

// Session ended
{ type: "sessionEnd", sessionId: string, exitCode: number }

// Error
{ type: "error", sessionId: string, message: string }
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | (none) |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |

### Volume Mounts

| Path | Description |
|------|-------------|
| `/home/claude/.claude` | Claude Code configuration |
| `/home/claude/.anthropic` | API credentials |
| `/home/claude/projects` | Working directory for projects |

## Development

### Running Locally (without Docker)

1. Install dependencies:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

3. Start the frontend (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

4. Open `http://localhost:5173`

### Building for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## Troubleshooting

### Claude Code not found

Make sure Claude Code is installed in the container:
```bash
docker exec -it claude-code-web claude --version
```

### WebSocket connection fails

Check that the backend is running and accessible:
```bash
curl http://localhost:3000/api/health
```

### Permission denied errors

Ensure the `claude` user has proper permissions:
```bash
docker exec -it claude-code-web ls -la /home/claude
```

## Security Considerations

- **API Key Storage**: API keys are stored in the container volume. In production, consider using secrets management.
- **Network**: The container exposes port 3000. Use a reverse proxy (nginx, traefik) for HTTPS in production.
- **Permissions**: Claude Code runs as a non-root user inside the container.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.
