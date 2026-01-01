import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useSession } from '../hooks/useSession';

export function SettingsModal() {
  const { showSettings, setShowSettings, settings, projects } = useStore();
  const { authenticate, logout, isAuthenticated, saveSettings, fetchProjects } = useSession();

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings.defaultModel);
  const [workingDir, setWorkingDir] = useState(settings.workingDirectory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Available models
  const models = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5' },
  ];

  useEffect(() => {
    if (showSettings) {
      fetchProjects();
      setModel(settings.defaultModel);
      setWorkingDir(settings.workingDirectory);
    }
  }, [showSettings, settings, fetchProjects]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await authenticate(apiKey);
    setLoading(false);

    if (result.success) {
      setSuccess('API key saved successfully');
      setApiKey('');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to save API key');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);

    const result = await saveSettings({
      defaultModel: model,
      workingDirectory: workingDir,
    });

    setLoading(false);

    if (result.success) {
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to save settings');
    }
  };

  const handleLogout = async () => {
    await logout();
    setSuccess('Logged out successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-claude-darker border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status messages */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-900/30 border border-green-700/50 text-green-300 px-4 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Authentication section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Authentication
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`status-indicator ${isAuthenticated ? 'connected' : 'disconnected'}`} />
              <span className={isAuthenticated ? 'text-green-400' : 'text-gray-400'}>
                {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
              </span>
            </div>
            {!isAuthenticated ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Anthropic API key (sk-...)"
                  className="w-full bg-gray-800 text-gray-100 rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
                >
                  {loading ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Model selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Default Model
            </h3>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-gray-800 text-gray-100 rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Working directory */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Working Directory
            </h3>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              placeholder="/home/claude/projects"
              className="w-full bg-gray-800 text-gray-100 rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
            />
            {projects.length > 0 && (
              <div className="text-sm text-gray-400">
                <p className="mb-2">Available projects:</p>
                <div className="flex flex-wrap gap-2">
                  {projects.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => setWorkingDir(p.path)}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-500">
          Claude Code Web Terminal v1.0.0
        </div>
      </div>
    </div>
  );
}
