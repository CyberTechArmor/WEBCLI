import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store';

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  content?: string;
  streamType?: string;
  tool?: string;
  status?: 'start' | 'end';
  request?: string;
  exitCode?: number;
  message?: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    sessionId,
    setConnected,
    setProcessing,
    addMessage,
    isConnected,
  } = useStore();

  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [setConnected]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('Server confirmed connection');
        break;

      case 'sessionStart':
        addMessage({
          type: 'system',
          content: 'Session started. Ready for your input.',
        });
        setProcessing(false);
        break;

      case 'output':
        if (message.content?.trim()) {
          addMessage({
            type: 'assistant',
            content: message.content,
          });
        }
        break;

      case 'thinking':
        addMessage({
          type: 'thinking',
          content: message.content || '',
          collapsed: true,
        });
        break;

      case 'toolUse':
        addMessage({
          type: 'tool',
          content: message.content || message.tool || '',
          toolName: message.tool,
          toolStatus: message.status,
        });
        break;

      case 'permission':
        addMessage({
          type: 'permission',
          content: message.request || message.content || '',
          permissionId: `perm-${Date.now()}`,
        });
        break;

      case 'sessionEnd':
        addMessage({
          type: 'system',
          content: `Session ended with exit code: ${message.exitCode}`,
        });
        setProcessing(false);
        break;

      case 'error':
        addMessage({
          type: 'error',
          content: message.message || 'An error occurred',
        });
        setProcessing(false);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [addMessage, setProcessing]);

  // Send message to server
  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    if (!sessionId) {
      console.error('No active session');
      return false;
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      sessionId,
      content,
    }));

    return true;
  }, [sessionId]);

  // Send interrupt signal
  const sendInterrupt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!sessionId) {
      return false;
    }

    wsRef.current.send(JSON.stringify({
      type: 'interrupt',
      sessionId,
    }));

    return true;
  }, [sessionId]);

  // Send confirm/reject for permission requests
  const sendConfirm = useCallback((accept: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!sessionId) {
      return false;
    }

    wsRef.current.send(JSON.stringify({
      type: 'confirm',
      sessionId,
      response: accept ? 'y' : 'n',
    }));

    return true;
  }, [sessionId]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Reconnect when session changes
  useEffect(() => {
    if (sessionId && !isConnected) {
      connect();
    }
  }, [sessionId, isConnected, connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    sendInterrupt,
    sendConfirm,
    reconnect: connect,
  };
}
