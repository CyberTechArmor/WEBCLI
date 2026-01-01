import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSession } from '../hooks/useSession';

export function InputArea() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isConnected, isProcessing, sessionId, settings } = useStore();
  const { sendMessage, sendInterrupt } = useWebSocket();
  const { startSession, isAuthenticated } = useSession();
  const { addMessage, setProcessing } = useStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    if (!isAuthenticated) {
      addMessage({
        type: 'error',
        content: 'Please configure your API key in settings first.',
      });
      return;
    }

    // Start session if not active
    if (!sessionId) {
      const result = await startSession();
      if (!result.success) {
        return;
      }
      // Wait a moment for session to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Add user message to chat
    addMessage({
      type: 'user',
      content: input.trim(),
    });

    // Send to backend
    setProcessing(true);
    const sent = sendMessage(input.trim());

    if (!sent) {
      addMessage({
        type: 'error',
        content: 'Failed to send message. Please check your connection.',
      });
      setProcessing(false);
    }

    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInterrupt = () => {
    sendInterrupt();
    setProcessing(false);
    addMessage({
      type: 'system',
      content: 'Interrupt signal sent.',
    });
  };

  return (
    <div className="border-t border-gray-800 bg-claude-darker px-4 py-3">
      <div className="max-w-4xl mx-auto">
        {/* Input row */}
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isAuthenticated
                  ? 'Configure your API key in settings to start...'
                  : sessionId
                  ? 'Type a message... (Enter to send, Shift+Enter for newline)'
                  : 'Type a message to start a new session...'
              }
              disabled={!isConnected || isProcessing}
              rows={1}
              className="w-full bg-gray-800 text-gray-100 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500 disabled:opacity-50"
            />
          </div>

          {/* Send/Stop button */}
          {isProcessing ? (
            <button
              onClick={handleInterrupt}
              className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-3 font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
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
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
                <span>Stop</span>
              </div>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || !isConnected}
              className="flex-shrink-0 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl px-4 py-3 font-medium transition-colors"
            >
              <div className="flex items-center gap-2">
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span>Send</span>
              </div>
            </button>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className={`status-indicator ${
                  isProcessing ? 'processing' : isConnected ? 'connected' : 'disconnected'
                }`}
              />
              <span>
                {isProcessing ? 'Processing...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {sessionId && (
              <span className="text-gray-600">
                Session: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>Model: {settings.defaultModel.split('-').slice(0, 2).join(' ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
