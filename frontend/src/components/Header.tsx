import React from 'react';
import { useStore } from '../store';
import { useSession } from '../hooks/useSession';

export function Header() {
  const { showSettings, setShowSettings, settings, isConnected, projects } = useStore();
  const { isAuthenticated } = useSession();

  return (
    <header className="bg-claude-darker border-b border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Claude Code</h1>
            <p className="text-xs text-gray-400">Web Terminal</p>
          </div>
        </div>

        {/* Project selector */}
        <div className="flex items-center gap-4">
          <select
            className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500"
            value={settings.workingDirectory}
            onChange={(e) => useStore.getState().updateSettings({ workingDirectory: e.target.value })}
          >
            <option value={settings.workingDirectory}>{settings.workingDirectory}</option>
            {projects.map((project) => (
              <option key={project.path} value={project.path}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            />
            <span className="text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Auth status */}
          <div className="flex items-center gap-2 text-sm">
            {isAuthenticated ? (
              <span className="text-green-400">Authenticated</span>
            ) : (
              <span className="text-yellow-400">Not authenticated</span>
            )}
          </div>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
