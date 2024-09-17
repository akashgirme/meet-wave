import * as dotenv from 'dotenv';
dotenv.config();

import { Socket } from 'socket.io';
import http from 'http';

import express from 'express';
import { Server } from 'socket.io';
import { UserManager } from './managers/UserManger';

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL;

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
  },
});

const userManager = new UserManager();

io.on('connection', (socket: Socket) => {
  console.log('a user connected');
  userManager.addUser('randomName', socket);
  socket.on('disconnect', () => {
    console.log('user disconnected');
    userManager.removeUser(socket.id);
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(
    `🚀🚀 Application server is listening on http://localhost:${port}`,
  );
});
