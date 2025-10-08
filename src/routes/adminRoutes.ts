import express from "express";
import SessionManager from "../services/sessionManager";
import { AxiosError } from "axios";
const router = express.Router();

// Admin routes factory
function createAdminRoutes(sessionManager: SessionManager) {
  // Get all user sessions
  router.get("/sessions", (_, res) => {
    try {
      const sessions = sessionManager.getAllSessions();
      res.json({
        success: true,
        data: sessions,
        total: sessions.length,
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error fetching sessions:", err);
      res.status(500).json({
        success: false,
        message: "Error fetching sessions",
        error: err.message,
      });
    }
  });

  // Get session statistics
  router.get("/stats", (_, res) => {
    try {
      const stats = sessionManager.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error fetching stats:", err);
      res.status(500).json({
        success: false,
        message: "Error fetching statistics",
        error: err.message,
      });
    }
  });

  // Clear all sessions
  router.post("/clear-sessions", (_, res) => {
    try {
      sessionManager.clearAllSessions();
      res.json({
        success: true,
        message: "All sessions cleared successfully",
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error clearing sessions:", err);
      res.status(500).json({
        success: false,
        message: "Error clearing sessions",
        error: err.message,
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

      return res.json({
        success: true,
        data: {
          phone: phoneNumber,
          ...session,
        },
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error fetching session:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching session",
        error: err.message,
      });
    }
  });

  // Delete specific session
  router.delete("/sessions/:phoneNumber", (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const deleted = sessionManager.deleteSession(phoneNumber);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Session not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Session deleted successfully",
      });
      return;
    } catch (error) {
      const err = error as AxiosError;
      console.error("Error deleting session:", err);
      res.status(500).json({
        success: false,
        message: "Error deleting session",
        error: err.message,
      });
      return;
    }
  });

  return router;
}

export default createAdminRoutes;
