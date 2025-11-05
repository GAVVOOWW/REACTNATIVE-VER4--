import { io } from 'socket.io-client';
import { API_BASE_URL } from "@env";

// Create the socket instance once and export it.
export const socket = io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: false // We will connect manually when needed.
});

// Export a function to get the socket instance
export const getSocket = () => socket; 