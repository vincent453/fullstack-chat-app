
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.put("/read/:notificationId", protectRoute, markAsRead);
router.put("/read-all", protectRoute, markAllAsRead);
router.delete("/:notificationId", protectRoute, deleteNotification);

export default router;
