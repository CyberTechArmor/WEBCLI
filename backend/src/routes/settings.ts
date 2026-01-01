import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { isAuthenticated } from './auth';
import { Settings } from '../types';

const router = Router();

// Default settings
const DEFAULT_SETTINGS = {
  defaultModel: 'claude-sonnet-4-20250514',
  workingDirectory: path.join(process.env.HOME || '/home/claude', 'projects'),
};

// Settings file path
const SETTINGS_FILE = path.join(process.env.HOME || '/home/claude', '.claude', 'web-settings.json');

// Load settings from file
function loadSettings(): Partial<Settings> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return {};
}

// Save settings to file
function saveSettings(settings: Partial<Settings>): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Get Claude version
function getClaudeVersion(): string {
  try {
    return execSync('claude --version', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Get MCP servers (placeholder for now)
function getMcpServers(): string[] {
  // In future, parse MCP config file
  // For MVP, return empty array
  return [];
}

// GET /api/settings - Get current settings
router.get('/', (req: Request, res: Response) => {
  const savedSettings = loadSettings();

  const settings: Settings = {
    authenticated: isAuthenticated(),
    claudeVersion: getClaudeVersion(),
    defaultModel: savedSettings.defaultModel || DEFAULT_SETTINGS.defaultModel,
    mcpServers: getMcpServers(),
    workingDirectory: savedSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
  };

  res.json(settings);
});

// POST /api/settings - Update settings
router.post('/', (req: Request, res: Response) => {
  const { defaultModel, workingDirectory } = req.body;
  const currentSettings = loadSettings();

  // Validate working directory if provided
  if (workingDirectory) {
    if (!fs.existsSync(workingDirectory)) {
      return res.status(400).json({
        success: false,
        error: `Working directory does not exist: ${workingDirectory}`,
      });
    }
    if (!fs.statSync(workingDirectory).isDirectory()) {
      return res.status(400).json({
        success: false,
        error: `Path is not a directory: ${workingDirectory}`,
      });
    }
  }

  // Update settings
  const newSettings: Partial<Settings> = {
    ...currentSettings,
    ...(defaultModel && { defaultModel }),
    ...(workingDirectory && { workingDirectory }),
  };

  try {
    saveSettings(newSettings);
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to save settings: ${errorMessage}`,
    });
  }
});

// GET /api/models - Get available models
router.get('/models', (req: Request, res: Response) => {
  // Return list of available Claude models
  const models = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast and capable' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', description: 'Fastest responses' },
  ];

  res.json({ models });
});

export default router;
