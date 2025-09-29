const express = require("express");
const bodyParser = require("body-parser");
const config = require("./src/config");

// Import services and handlers
const SessionManager = require("./src/services/sessionManager");
const WebhookHandler = require("./src/handlers/webhookHandler");
const ConversationHandler = require("./src/handlers/conversionHandler");
const createAdminRoutes = require("./src/routes/adminRoutes");
const createPaymentRoutes = require("./src/routes/paymentRoutes");

// Initialize services
const sessionManager = new SessionManager();
const webhookHandler = new WebhookHandler(sessionManager);
const conversationHandler = new ConversationHandler(sessionManager);

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Kiya Loan Bot Server!",
    status: "running",
    version: "1.0.0",
    endpoints: {
      webhook_get: "/webhook",
      webhook_post: "/webhook",
      admin: "/admin/*",
      payment_webhook: "/payment/webhook",
      payment_confirm: "/payment/confirm",
      payment_status: "/payment/status/:phone",
    },
  });
});

// Webhook verification (GET)
app.get("/webhook", (req, res) => {
  webhookHandler.handleWebhookVerification(req, res);
});

// Webhook handler (POST)
app.post("/webhook", async (req, res) => {
  await webhookHandler.handleWebhook(req, res);
});

// Admin routes
app.use("/admin", createAdminRoutes(sessionManager));

// Payment routes
app.use("/payment", createPaymentRoutes(sessionManager, conversationHandler));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessions: sessionManager.getStats(),
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Kiya WhatsApp Bot Server is running on port ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin/stats`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
