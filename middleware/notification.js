const Notification = require("../models/Notification");

// Create a new notification
const createNotification = async (userId, type, message, userDetails) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      message,
      userDetails,
    });
    await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

module.exports = { createNotification };
