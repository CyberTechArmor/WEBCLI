import { ToolMatch, PermissionMatch } from './types';

// ANSI escape code regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

// Strip ANSI escape codes from text
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

// Tool patterns to detect
const TOOL_START_PATTERNS: Record<string, RegExp[]> = {
  'Read': [/Reading\s+(.+)/i, /Read\s+file/i],
  'Write': [/Writing\s+(.+)/i, /Creating\s+file/i, /Write\s+file/i],
  'Edit': [/Editing\s+(.+)/i, /Edit\s+file/i, /Updating\s+(.+)/i],
  'Bash': [/Running\s+(.+)/i, /Executing\s+(.+)/i, /\$\s+(.+)/],
  'Glob': [/Searching\s+for\s+files/i, /Finding\s+files/i, /Glob/i],
  'Grep': [/Searching\s+(.+)/i, /Grep/i],
  'WebFetch': [/Fetching\s+(.+)/i, /WebFetch/i],
  'Task': [/Launching\s+agent/i, /Task/i],
};

const TOOL_END_PATTERNS: Record<string, RegExp[]> = {
  'Read': [/Read\s+\d+\s+lines/i, /File\s+read/i],
  'Write': [/File\s+created/i, /File\s+written/i, /Wrote\s+\d+\s+lines/i],
  'Edit': [/File\s+edited/i, /Updated\s+(.+)/i, /Edit\s+successful/i],
  'Bash': [/Command\s+completed/i, /Exit\s+code/i],
};

// Permission patterns
const PERMISSION_PATTERNS = [
  /Allow\s+this\s+action\?/i,
  /Do\s+you\s+want\s+to\s+proceed\?/i,
  /\[y\/n\]/i,
  /\(y\/N\)/i,
  /\(Y\/n\)/i,
  /Press\s+y\s+to\s+confirm/i,
  /Approve\?/i,
];

// Thinking indicators (Claude often uses dimmed/italic for thinking)
const THINKING_PATTERNS = [
  /^\s*\[thinking\]/i,
  /^\s*Thinking\.\.\./i,
  /^\s*Let me think/i,
  /^\s*I('m| am)\s+thinking/i,
];

// Detect tool usage start
export function detectToolStart(text: string): ToolMatch | null {
  const cleanText = stripAnsi(text);

  for (const [tool, patterns] of Object.entries(TOOL_START_PATTERNS)) {
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        return {
          tool,
          status: 'start',
          content: match[1] || cleanText.trim(),
        };
      }
    }
  }

  return null;
}

// Detect tool usage end
export function detectToolEnd(text: string): ToolMatch | null {
  const cleanText = stripAnsi(text);

  for (const [tool, patterns] of Object.entries(TOOL_END_PATTERNS)) {
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        return {
          tool,
          status: 'end',
          content: match[1] || cleanText.trim(),
        };
      }
    }
  }

  return null;
}

// Detect permission request
export function detectPermission(text: string): PermissionMatch | null {
  const cleanText = stripAnsi(text);

  for (const pattern of PERMISSION_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        request: cleanText.trim(),
        type: 'confirm',
      };
    }
  }

  return null;
}

// Detect thinking block
export function detectThinking(text: string): boolean {
  const cleanText = stripAnsi(text);

  for (const pattern of THINKING_PATTERNS) {
    if (pattern.test(cleanText)) {
      return true;
    }
  }

  // Also check for ANSI dim/italic codes which Claude uses for thinking
  if (text.includes('\x1b[2m') || text.includes('\x1b[3m')) {
    return true;
  }

  return false;
}

// Parse a chunk of output and categorize it
export interface ParsedOutput {
  type: 'text' | 'thinking' | 'toolStart' | 'toolEnd' | 'permission';
  content: string;
  tool?: string;
  request?: string;
}

export function parseOutput(text: string): ParsedOutput[] {
  const results: ParsedOutput[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check for permission first (highest priority)
    const permission = detectPermission(line);
    if (permission) {
      results.push({
        type: 'permission',
        content: line,
        request: permission.request,
      });
      continue;
    }

    // Check for tool start
    const toolStart = detectToolStart(line);
    if (toolStart) {
      results.push({
        type: 'toolStart',
        content: toolStart.content,
        tool: toolStart.tool,
      });
      continue;
    }

    // Check for tool end
    const toolEnd = detectToolEnd(line);
    if (toolEnd) {
      results.push({
        type: 'toolEnd',
        content: toolEnd.content,
        tool: toolEnd.tool,
      });
      continue;
    }

    // Check for thinking
    if (detectThinking(line)) {
      results.push({
        type: 'thinking',
        content: stripAnsi(line),
      });
      continue;
    }

    // Default to regular text
    results.push({
      type: 'text',
      content: stripAnsi(line),
    });
  }

  return results;
}

// Convert parsed output to WebSocket messages
export function outputToMessages(sessionId: string, parsed: ParsedOutput[]): any[] {
  return parsed.map(item => {
    switch (item.type) {
      case 'text':
        return {
          type: 'output',
          sessionId,
          content: item.content,
          streamType: 'stdout',
        };
      case 'thinking':
        return {
          type: 'thinking',
          sessionId,
          content: item.content,
        };
      case 'toolStart':
        return {
          type: 'toolUse',
          sessionId,
          tool: item.tool,
          status: 'start',
          content: item.content,
        };
      case 'toolEnd':
        return {
          type: 'toolUse',
          sessionId,
          tool: item.tool,
          status: 'end',
          content: item.content,
        };
      case 'permission':
        return {
          type: 'permission',
          sessionId,
          request: item.request,
          content: item.content,
        };
      default:
        return {
          type: 'output',
          sessionId,
          content: item.content,
          streamType: 'stdout',
        };
    }
  });
}
