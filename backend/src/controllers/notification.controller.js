
import Notification from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'fullName profilePic')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      read: false 
    });

    res.status(200).json({
      notifications,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(await Notification.countDocuments({ recipient: userId }) / limit)
    });
  } catch (error) {
    console.log("Error in getNotifications controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Emit updated unread count
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      read: false 
    });

    const userSocketId = getReceiverSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("unreadCountUpdate", unreadCount);
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.log("Error in markAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );

    // Emit updated unread count
    const userSocketId = getReceiverSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("unreadCountUpdate", 0);
    }

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.log("Error in markAllAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.log("Error in deleteNotification controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a notification (utility function)
export const createNotification = async (recipientId, senderId, type, title, message, additionalData = {}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      ...additionalData
    });

    await notification.save();
    await notification.populate('sender', 'fullName profilePic');

    // Send real-time notification
    const receiverSocketId = getReceiverSocketId(recipientId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newNotification", notification);
      
      // Update unread count
      const unreadCount = await Notification.countDocuments({ 
        recipient: recipientId, 
        read: false 
      });
      io.to(receiverSocketId).emit("unreadCountUpdate", unreadCount);
    }

    return notification;
  } catch (error) {
    console.log("Error creating notification: ", error.message);
    throw error;
  }
};
