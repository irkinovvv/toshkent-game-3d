import { io } from 'socket.io-client';

export const connect = (url) => {
  // Agar server manzili bo'lmasa, o'yin qotib qolmasligi uchun soxta (mock) socket qaytaramiz
  if (!url) {
    console.warn("Server o'chirilgan, offline rejimda ishlayapti.");
    return {
      on: () => {},
      emit: () => {},
      off: () => {},
      connected: false
    };
  }
  return io(url, { transports: ['websocket'] });
};