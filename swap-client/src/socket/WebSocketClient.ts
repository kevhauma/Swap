import { useEffect } from 'react';
import io from 'socket.io-client';

const WebSocketClient = ({ onDataReceived }) => {
  useEffect(() => {
    const socket = io('your-websocket-server-url');

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('data', (data) => {
      onDataReceived(data);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [onDataReceived]);

  return null;
};

export default WebSocketClient;
