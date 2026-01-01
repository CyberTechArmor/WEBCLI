import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Message types
export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'thinking' | 'tool' | 'permission' | 'error' | 'system';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolStatus?: 'start' | 'end';
  permissionId?: string;
  collapsed?: boolean;
}

// Settings interface
export interface Settings {
  apiKey: string;
  defaultModel: string;
  workingDirectory: string;
}

// App state interface
export interface AppState {
  // Auth
  isAuthenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;

  // Session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
  isProcessing: boolean;
  setProcessing: (processing: boolean) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // UI State
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Projects
  projects: { name: string; path: string }[];
  setProjects: (projects: { name: string; path: string }[]) => void;
}

// Generate unique ID
const generateId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Create the store with persistence for settings
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      // Session
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),
      isProcessing: false,
      setProcessing: (processing) => set({ isProcessing: processing }),

      // Messages
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            },
          ],
        })),
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),
      clearMessages: () => set({ messages: [] }),

      // Settings
      settings: {
        apiKey: '',
        defaultModel: 'claude-sonnet-4-20250514',
        workingDirectory: '/home/claude/projects',
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // UI State
      showSettings: false,
      setShowSettings: (show) => set({ showSettings: show }),

      // Projects
      projects: [],
      setProjects: (projects) => set({ projects }),
    }),
    {
      name: 'claude-code-web-storage',
      partialize: (state) => ({
        settings: {
          ...state.settings,
          // Don't persist API key in localStorage for security
          apiKey: '',
        },
      }),
    }
  )
);
