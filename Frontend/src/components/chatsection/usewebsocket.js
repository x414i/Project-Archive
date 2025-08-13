import { useCallback, useRef, useEffect } from 'react';

export const useWebSocket = (token, handlers) => {
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//localhost:8080/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handlersRef.current.onMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket Disconnected');
      if (wsRef.current && event.code !== 1000 && event.code !== 1001) {
        setTimeout(initializeWebSocket, 3000);
      }
    };
  }, [token]); 

  useEffect(() => {
    initializeWebSocket();

    return () => {
      const ws = wsRef.current;
      if (ws) {
        wsRef.current = null;
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [initializeWebSocket]);

  return wsRef;
};