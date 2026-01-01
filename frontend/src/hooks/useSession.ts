import { useCallback, useEffect } from 'react';
import { useStore } from '../store';

interface StartSessionParams {
  workingDirectory?: string;
  model?: string;
}

export function useSession() {
  const {
    sessionId,
    setSessionId,
    isAuthenticated,
    setAuthenticated,
    settings,
    updateSettings,
    setProcessing,
    addMessage,
    setProjects,
  } = useStore();

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      setAuthenticated(data.authenticated);
      return data.authenticated;
    } catch (error) {
      console.error('Failed to check auth:', error);
      return false;
    }
  }, [setAuthenticated]);

  // Authenticate with API key
  const authenticate = useCallback(async (apiKey: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await response.json();

      if (data.success) {
        setAuthenticated(true);
        updateSettings({ apiKey });
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, [setAuthenticated, updateSettings]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setAuthenticated(false);
      updateSettings({ apiKey: '' });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }, [setAuthenticated, updateSettings]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      updateSettings({
        defaultModel: data.defaultModel,
        workingDirectory: data.workingDirectory,
      });
      return data;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    }
  }, [updateSettings]);

  // Update settings on server
  const saveSettings = useCallback(async (newSettings: Partial<typeof settings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await response.json();

      if (data.success) {
        updateSettings(newSettings);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, [updateSettings]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
      return data.projects || [];
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      return [];
    }
  }, [setProjects]);

  // Start a new session
  const startSession = useCallback(async (params: StartSessionParams = {}) => {
    if (!isAuthenticated) {
      addMessage({
        type: 'error',
        content: 'Not authenticated. Please enter your API key in settings.',
      });
      return { success: false, error: 'Not authenticated' };
    }

    setProcessing(true);
    addMessage({
      type: 'system',
      content: 'Starting new Claude session...',
    });

    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingDirectory: params.workingDirectory || settings.workingDirectory,
          model: params.model || settings.defaultModel,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        addMessage({
          type: 'system',
          content: `Session started. Working directory: ${data.workingDirectory}`,
        });
        return { success: true, sessionId: data.sessionId };
      } else {
        setProcessing(false);
        addMessage({
          type: 'error',
          content: data.error || 'Failed to start session',
        });
        return { success: false, error: data.error };
      }
    } catch (error) {
      setProcessing(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      addMessage({
        type: 'error',
        content: `Failed to start session: ${message}`,
      });
      return { success: false, error: message };
    }
  }, [isAuthenticated, settings, setSessionId, setProcessing, addMessage]);

  // Stop the current session
  const stopSession = useCallback(async () => {
    if (!sessionId) return { success: false, error: 'No active session' };

    try {
      const response = await fetch(`/api/session/${sessionId}/stop`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setSessionId(null);
        setProcessing(false);
        addMessage({
          type: 'system',
          content: 'Session stopped.',
        });
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, [sessionId, setSessionId, setProcessing, addMessage]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
    fetchSettings();
    fetchProjects();
  }, [checkAuth, fetchSettings, fetchProjects]);

  return {
    sessionId,
    isAuthenticated,
    authenticate,
    logout,
    checkAuth,
    fetchSettings,
    saveSettings,
    fetchProjects,
    startSession,
    stopSession,
  };
}
