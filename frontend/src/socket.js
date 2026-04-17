import { io } from 'socket.io-client';

const URL = 'http://localhost:5000'; // Target the express backend for mvp

export const socket = io(URL, {
    autoConnect: true
});
