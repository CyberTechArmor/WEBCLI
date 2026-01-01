import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, useStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';

// Individual message components
function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-700 text-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="message-content prose prose-invert prose-sm">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ThinkingMessage({ message }: { message: Message }) {
  const [collapsed, setCollapsed] = useState(message.collapsed ?? true);
  const { updateMessage } = useStore();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    updateMessage(message.id, { collapsed: !collapsed });
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-2 text-gray-400 text-sm hover:text-gray-300 transition-colors mb-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Thinking...</span>
        </button>
        {!collapsed && (
          <div className="thinking-block text-gray-400 text-sm italic border-l-2 border-gray-600 pl-3 py-1">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolMessage({ message }: { message: Message }) {
  const isStart = message.toolStatus === 'start';
  const icon = isStart ? '...' : 'OK';
  const statusClass = isStart ? 'start' : 'end';

  return (
    <div className="flex justify-start">
      <div className={`tool-badge ${statusClass}`}>
        <span className="font-mono">{isStart ? 'Running' : 'Done'}</span>
        <span className="font-medium">{message.toolName}</span>
        {message.content && (
          <span className="text-gray-300 truncate max-w-[200px]">{message.content}</span>
        )}
      </div>
    </div>
  );
}

function PermissionMessage({ message }: { message: Message }) {
  const { sendConfirm } = useWebSocket();
  const [responded, setResponded] = useState(false);

  const handleResponse = (accept: boolean) => {
    if (!responded) {
      sendConfirm(accept);
      setResponded(true);
    }
  };

  return (
    <div className="flex justify-start">
      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3 max-w-[80%]">
        <div className="flex items-start gap-2 mb-3">
          <svg
            className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-yellow-200 text-sm">{message.content}</p>
        </div>
        {!responded ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleResponse(true)}
              className="permission-button accept"
            >
              Accept
            </button>
            <button
              onClick={() => handleResponse(false)}
              className="permission-button reject"
            >
              Reject
            </button>
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">Response sent</p>
        )}
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center">
      <div className="text-gray-500 text-sm italic px-4 py-1">
        {message.content}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-start">
      <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2 max-w-[80%]">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-300 text-sm">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

// Message renderer
function MessageRenderer({ message }: { message: Message }) {
  switch (message.type) {
    case 'user':
      return <UserMessage message={message} />;
    case 'assistant':
      return <AssistantMessage message={message} />;
    case 'thinking':
      return <ThinkingMessage message={message} />;
    case 'tool':
      return <ToolMessage message={message} />;
    case 'permission':
      return <PermissionMessage message={message} />;
    case 'system':
      return <SystemMessage message={message} />;
    case 'error':
      return <ErrorMessage message={message} />;
    default:
      return null;
  }
}

// Main MessageList component
export function MessageList() {
  const { messages } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium mb-1">Start a conversation</p>
          <p className="text-sm">Type a message to begin working with Claude Code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => (
        <MessageRenderer key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
