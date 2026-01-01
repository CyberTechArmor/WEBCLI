import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Store API key in environment and persist to file
const ANTHROPIC_KEY_FILE = path.join(process.env.HOME || '/home/claude', '.anthropic', 'api_key');

// Ensure the directory exists
function ensureAnthropicDir(): void {
  const dir = path.dirname(ANTHROPIC_KEY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Save API key to file
function saveApiKey(apiKey: string): void {
  ensureAnthropicDir();
  fs.writeFileSync(ANTHROPIC_KEY_FILE, apiKey, { mode: 0o600 });
  process.env.ANTHROPIC_API_KEY = apiKey;
}

// Load API key from file
function loadApiKey(): string | null {
  try {
    if (fs.existsSync(ANTHROPIC_KEY_FILE)) {
      return fs.readFileSync(ANTHROPIC_KEY_FILE, 'utf-8').trim();
    }
  } catch {
    // Ignore errors
  }
  return process.env.ANTHROPIC_API_KEY || null;
}

// Check if authenticated
function isAuthenticated(): boolean {
  const apiKey = loadApiKey();
  return !!apiKey && apiKey.startsWith('sk-');
}

// POST /api/auth - Store/validate Anthropic credentials
router.post('/', (req: Request, res: Response) => {
  const { apiKey, loginToken } = req.body;

  if (apiKey) {
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format. Key should start with "sk-"',
      });
    }

    // Save the API key
    try {
      saveApiKey(apiKey);
      return res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: `Failed to save API key: ${errorMessage}`,
      });
    }
  }

  if (loginToken) {
    // For MVP, we don't support login token flow
    // Claude Code's native login requires browser redirect
    return res.status(400).json({
      success: false,
      error: 'Login token flow not supported in MVP. Please use API key.',
    });
  }

  return res.status(400).json({
    success: false,
    error: 'Please provide either apiKey or loginToken',
  });
});

// GET /api/auth - Check authentication status
router.get('/', (req: Request, res: Response) => {
  res.json({
    authenticated: isAuthenticated(),
  });
});

// DELETE /api/auth - Clear credentials
router.delete('/', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(ANTHROPIC_KEY_FILE)) {
      fs.unlinkSync(ANTHROPIC_KEY_FILE);
    }
    delete process.env.ANTHROPIC_API_KEY;
    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to clear credentials: ${errorMessage}`,
    });
  }
});

export default router;
export { isAuthenticated, loadApiKey };
