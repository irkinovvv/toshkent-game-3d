import { io } from 'socket.io-client';
export const connect = (url) => io(url, { transports: ['websocket'] });
