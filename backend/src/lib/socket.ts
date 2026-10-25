import express, { Express } from "express";
import http from "http";
import { Server } from "socket.io";
import { FRONTEND_URL } from "../constants/env";

const app: Express = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: [FRONTEND_URL] } });

function getReceiverSocketId(receiverId: string): string | undefined {
  return userSocketMap[receiverId];
}

// online users map = { userId: socketId }
const userSocketMap: Record<string, string> = {};

io.on("connection", function (socket) {
  let userId = socket.handshake.query.userId;
  if (Array.isArray(userId)) {
    userId = userId[0];
  }
  if (typeof userId === "string" && userId) {
    userSocketMap[userId] = socket.id;
  }
  // io.emit() sends event to everyone - broadcast
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // socket.on() is used to listen for events
  socket.on("disconnect", function () {
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io, getReceiverSocketId };
