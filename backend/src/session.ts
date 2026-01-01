import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { parseOutput, outputToMessages, stripAnsi } from './parser';
import { SessionState, ServerMessage } from './types';

export class ClaudeSession extends EventEmitter {
  public id: string;
  public workingDirectory: string;
  public model: string;
  public isActive: boolean;
  public createdAt: Date;

  private pty: pty.IPty | null = null;
  private outputBuffer: string = '';
  private isProcessing: boolean = false;

  constructor(workingDirectory: string, model: string) {
    super();
    this.id = uuidv4();
    this.workingDirectory = workingDirectory;
    this.model = model;
    this.isActive = false;
    this.createdAt = new Date();
  }

  async start(): Promise<void> {
    try {
      // Build Claude command arguments
      const args: string[] = [];
      if (this.model) {
        args.push('--model', this.model);
      }

      // Spawn Claude Code in a pseudo-terminal
      this.pty = pty.spawn('claude', args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: this.workingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1',
        } as { [key: string]: string },
      });

      this.isActive = true;

      // Handle output from Claude
      this.pty.onData((data: string) => {
        this.handleOutput(data);
      });

      // Handle exit
      this.pty.onExit(({ exitCode }) => {
        this.isActive = false;
        this.emit('exit', exitCode);
        this.emit('message', {
          type: 'sessionEnd',
          sessionId: this.id,
          exitCode,
        } as ServerMessage);
      });

      // Emit session start
      this.emit('message', {
        type: 'sessionStart',
        sessionId: this.id,
      } as ServerMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('message', {
        type: 'error',
        sessionId: this.id,
        message: `Failed to start Claude session: ${errorMessage}`,
      } as ServerMessage);
      throw error;
    }
  }

  private handleOutput(data: string): void {
    // Buffer the output and process it
    this.outputBuffer += data;

    // Process complete lines
    const lines = this.outputBuffer.split('\n');

    // Keep the last incomplete line in the buffer
    this.outputBuffer = lines.pop() || '';

    if (lines.length > 0) {
      const completeOutput = lines.join('\n');

      // Parse the output
      const parsed = parseOutput(completeOutput);
      const messages = outputToMessages(this.id, parsed);

      // Emit each message
      for (const msg of messages) {
        this.emit('message', msg);
      }
    }

    // Also emit raw output for immediate display
    // This ensures we don't miss anything during buffering
    const cleanData = stripAnsi(data);
    if (cleanData.trim()) {
      this.emit('rawOutput', {
        type: 'output',
        sessionId: this.id,
        content: cleanData,
        streamType: 'stdout',
      } as ServerMessage);
    }
  }

  send(input: string): void {
    if (!this.pty || !this.isActive) {
      this.emit('message', {
        type: 'error',
        sessionId: this.id,
        message: 'Session is not active',
      } as ServerMessage);
      return;
    }

    this.isProcessing = true;
    this.pty.write(input + '\n');
  }

  interrupt(): void {
    if (!this.pty || !this.isActive) return;

    // Send Escape key to interrupt Claude
    this.pty.write('\x1b');
    this.isProcessing = false;
  }

  confirm(yes: boolean): void {
    if (!this.pty || !this.isActive) return;

    this.pty.write(yes ? 'y\n' : 'n\n');
  }

  resize(cols: number, rows: number): void {
    if (this.pty) {
      this.pty.resize(cols, rows);
    }
  }

  stop(): void {
    if (this.pty) {
      this.isActive = false;
      this.pty.kill();
      this.pty = null;
    }
  }

  getState(): SessionState {
    return {
      id: this.id,
      workingDirectory: this.workingDirectory,
      model: this.model,
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }
}

// Session manager to track all active sessions
export class SessionManager {
  private sessions: Map<string, ClaudeSession> = new Map();

  createSession(workingDirectory: string, model: string): ClaudeSession {
    const session = new ClaudeSession(workingDirectory, model);
    this.sessions.set(session.id, session);

    // Clean up session on exit
    session.on('exit', () => {
      // Keep session in map for a bit so clients can get the exit status
      setTimeout(() => {
        this.sessions.delete(session.id);
      }, 60000); // Keep for 1 minute after exit
    });

    return session;
  }

  getSession(id: string): ClaudeSession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values()).map(s => s.getState());
  }

  stopSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (session) {
      session.stop();
      return true;
    }
    return false;
  }

  stopAllSessions(): void {
    for (const session of this.sessions.values()) {
      session.stop();
    }
    this.sessions.clear();
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
