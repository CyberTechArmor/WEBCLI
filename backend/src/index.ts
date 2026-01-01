import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import * as path from 'path';
import * as fs from 'fs';

import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import sessionRouter from './routes/session';
import { sessionManager, ClaudeSession } from './session';
import { ClientMessage, ServerMessage } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/session', sessionRouter);

// Projects route (separate from session)
app.get('/api/projects', (req: Request, res: Response) => {
  const PROJECTS_DIR = path.join(process.env.HOME || '/home/claude', 'projects');

  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      fs.mkdirSync(PROJECTS_DIR, { recursive: true });
    }

    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    const projects = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(PROJECTS_DIR, entry.name),
      }));

    res.json({
      success: true,
      projects,
      baseDir: PROJECTS_DIR,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to list projects: ${errorMessage}`,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Fallback to frontend for SPA routing
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built' });
  }
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Track WebSocket connections per session
const sessionConnections = new Map<string, Set<WebSocket>>();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Claude Code Web Terminal',
  } as ServerMessage));

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleClientMessage(ws, message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      } as ServerMessage));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove from all session connections
    for (const [sessionId, connections] of sessionConnections.entries()) {
      connections.delete(ws);
      if (connections.size === 0) {
        sessionConnections.delete(sessionId);
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle client messages
function handleClientMessage(ws: WebSocket, message: ClientMessage): void {
  const { type, sessionId, content, response } = message;

  // Validate session exists
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify({
      type: 'error',
      sessionId,
      message: 'Session not found',
    } as ServerMessage));
    return;
  }

  // Register this WebSocket connection for the session
  if (!sessionConnections.has(sessionId)) {
    sessionConnections.set(sessionId, new Set());
    // Subscribe to session events
    subscribeToSession(session);
  }
  sessionConnections.get(sessionId)!.add(ws);

  // Handle message types
  switch (type) {
    case 'message':
      if (content) {
        session.send(content);
      }
      break;

    case 'interrupt':
      session.interrupt();
      break;

    case 'confirm':
      if (response) {
        session.confirm(response === 'y');
      }
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: `Unknown message type: ${type}`,
      } as ServerMessage));
  }
}

// Subscribe to session events and broadcast to connected clients
function subscribeToSession(session: ClaudeSession): void {
  // Broadcast parsed messages
  session.on('message', (msg: ServerMessage) => {
    broadcastToSession(session.id, msg);
  });

  // Also broadcast raw output for real-time display
  session.on('rawOutput', (msg: ServerMessage) => {
    broadcastToSession(session.id, msg);
  });
}

// Broadcast message to all clients connected to a session
function broadcastToSession(sessionId: string, message: ServerMessage): void {
  const connections = sessionConnections.get(sessionId);
  if (!connections) return;

  const data = JSON.stringify(message);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  sessionManager.stopAllSessions();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  sessionManager.stopAllSessions();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Claude Code Web Terminal running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});
