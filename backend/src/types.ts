// WebSocket message types from client to server
export interface ClientMessage {
  type: 'message' | 'interrupt' | 'confirm';
  sessionId: string;
  content?: string;
  response?: 'y' | 'n';
}

// WebSocket message types from server to client
export interface ServerMessage {
  type: 'output' | 'thinking' | 'toolUse' | 'permission' | 'sessionEnd' | 'error' | 'sessionStart' | 'connected';
  sessionId?: string;
  content?: string;
  streamType?: 'stdout' | 'stderr';
  tool?: string;
  status?: 'start' | 'end';
  request?: string;
  exitCode?: number;
  message?: string;
}

// Session state
export interface SessionState {
  id: string;
  workingDirectory: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
}

// Settings
export interface Settings {
  authenticated: boolean;
  claudeVersion: string;
  defaultModel: string;
  mcpServers: string[];
  workingDirectory: string;
}

// Auth request
export interface AuthRequest {
  apiKey?: string;
  loginToken?: string;
}

// Session start request
export interface SessionStartRequest {
  workingDirectory?: string;
  model?: string;
}

// Tool patterns for parsing
export interface ToolMatch {
  tool: string;
  status: 'start' | 'end';
  content: string;
}

// Permission request
export interface PermissionMatch {
  request: string;
  type: string;
}
