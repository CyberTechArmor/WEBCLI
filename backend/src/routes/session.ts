import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { sessionManager } from '../session';
import { isAuthenticated } from './auth';

const router = Router();

// Default projects directory
const PROJECTS_DIR = path.join(process.env.HOME || '/home/claude', 'projects');

// POST /api/session/start - Start a new Claude session
router.post('/start', async (req: Request, res: Response) => {
  // Check authentication
  if (!isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated. Please provide an API key.',
    });
  }

  const { workingDirectory, model } = req.body;
  const cwd = workingDirectory || PROJECTS_DIR;
  const modelName = model || 'claude-sonnet-4-20250514';

  // Validate working directory
  if (!fs.existsSync(cwd)) {
    try {
      fs.mkdirSync(cwd, { recursive: true });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Cannot create working directory: ${cwd}`,
      });
    }
  }

  try {
    const session = sessionManager.createSession(cwd, modelName);
    await session.start();

    res.json({
      success: true,
      sessionId: session.id,
      workingDirectory: cwd,
      model: modelName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to start session: ${errorMessage}`,
    });
  }
});

// POST /api/session/:id/stop - Stop a Claude session
router.post('/:id/stop', (req: Request, res: Response) => {
  const { id } = req.params;

  const success = sessionManager.stopSession(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({
      success: false,
      error: 'Session not found',
    });
  }
});

// GET /api/session/:id - Get session status
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const session = sessionManager.getSession(id);
  if (session) {
    res.json({
      success: true,
      session: session.getState(),
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Session not found',
    });
  }
});

// GET /api/sessions - List all active sessions
router.get('/', (req: Request, res: Response) => {
  const sessions = sessionManager.getAllSessions();
  res.json({
    success: true,
    sessions,
  });
});

// GET /api/projects - List available project directories
router.get('/projects', (req: Request, res: Response) => {
  try {
    // Ensure projects directory exists
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

export default router;
