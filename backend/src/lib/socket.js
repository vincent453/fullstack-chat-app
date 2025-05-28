import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}
const userNotificationPreferences = {}; // Store user notification preferences

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    
    // Set default notification preferences if not exists
    if (!userNotificationPreferences[userId]) {
      userNotificationPreferences[userId] = {
        sound: true,
        desktop: true,
        inApp: true
      };
    }
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle notification preferences update
  socket.on("updateNotificationPreferences", (preferences) => {
    if (userId) {
      userNotificationPreferences[userId] = { ...userNotificationPreferences[userId], ...preferences };
      socket.emit("notificationPreferencesUpdated", userNotificationPreferences[userId]);
    }
  });

  // Handle notification read status
  socket.on("markNotificationAsRead", (notificationId) => {
    // You could store this in database for persistence
    socket.emit("notificationMarkedAsRead", notificationId);
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const receiverSocketId = getReceiverSocketId(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        senderId: userId,
        senderName: data.senderName
      });
    }
  });

  socket.on("stopTyping", (data) => {
    const receiverSocketId = getReceiverSocketId(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", {
        senderId: userId
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server, userNotificationPreferences };
