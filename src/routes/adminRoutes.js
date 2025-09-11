const express = require("express");
const router = express.Router();

// Admin routes factory
function createAdminRoutes(sessionManager) {
  // Get all user sessions
  router.get("/sessions", (req, res) => {
    try {
      const sessions = sessionManager.getAllSessions();
      res.json({
        success: true,
        data: sessions,
        total: sessions.length,
      });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching sessions",
        error: error.message,
      });
    }
  });

  // Get session statistics
  router.get("/stats", (req, res) => {
    try {
      const stats = sessionManager.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching statistics",
        error: error.message,
      });
    }
  });

  // Clear all sessions
  router.post("/clear-sessions", (req, res) => {
    try {
      sessionManager.clearAllSessions();
      res.json({
        success: true,
        message: "All sessions cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing sessions:", error);
      res.status(500).json({
        success: false,
        message: "Error clearing sessions",
        error: error.message,
      });
    }
  });

  // Get specific session
  router.get("/sessions/:phoneNumber", (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const session = sessionManager.getSession(phoneNumber);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      res.json({
        success: true,
        data: {
          phone: phoneNumber,
          ...session,
        },
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching session",
        error: error.message,
      });
    }
  });

  // Delete specific session
  router.delete("/sessions/:phoneNumber", (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const deleted = sessionManager.deleteSession(phoneNumber);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      res.json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting session",
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = createAdminRoutes;
