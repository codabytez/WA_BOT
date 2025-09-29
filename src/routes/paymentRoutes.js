const express = require("express");
const router = express.Router();
const { USER_STATES } = require("../constants/states");

// Payment webhook routes factory
function createPaymentRoutes(sessionManager, conversationHandler) {
  // Handle payment webhook from payment processor
  router.post("/webhook", async (req, res) => {
    try {
      const { event, data } = req.body;

      // Log the webhook for debugging
      console.log(
        "Payment webhook received:",
        JSON.stringify(req.body, null, 2)
      );

      // Handle successful payment
      if (event === "payment.success" || event === "charge.success") {
        const { email, reference, amount } = data;

        // Find user session by email
        const sessions = sessionManager.getAllSessions();
        const userSession = sessions.find(
          (session) =>
            session.data.email === email &&
            session.state === USER_STATES.PAYMENT_PENDING
        );

        if (userSession) {
          // Update payment reference
          userSession.data.payment_reference = reference;
          userSession.data.payment_amount = amount;
          sessionManager.updateSession(userSession.phone, userSession);

          // Confirm payment and proceed
          await conversationHandler.confirmPayment(
            userSession.phone,
            userSession
          );

          console.log(`Payment confirmed for user: ${email}`);
        } else {
          console.log(`No pending session found for email: ${email}`);
        }
      }

      // Handle failed payment
      else if (event === "payment.failed" || event === "charge.failed") {
        const { email, reference } = data;

        // Find user session by email
        const sessions = sessionManager.getAllSessions();
        const userSession = sessions.find(
          (session) =>
            session.data.email === email &&
            (session.state === USER_STATES.AWAITING_PAYMENT ||
              session.state === USER_STATES.PAYMENT_PENDING)
        );

        if (userSession) {
          // Notify user about failed payment
          await conversationHandler.whatsappService.sendMessage(
            userSession.phone,
            "❌ Payment failed. Please try again or contact support.\n\n" +
              "You can:\n" +
              "• Try the payment link again\n" +
              "• Make a bank transfer and send the reference\n" +
              "• Contact support for assistance"
          );

          // Reset to payment state
          userSession.state = USER_STATES.AWAITING_PAYMENT;
          sessionManager.updateSession(userSession.phone, userSession);

          console.log(`Payment failed for user: ${email}`);
        }
      }

      res.status(200).json({ status: "success", message: "Webhook processed" });
    } catch (error) {
      console.error("Payment webhook error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Webhook processing failed" });
    }
  });

  // Manual payment confirmation endpoint (for admin use)
  router.post("/confirm", async (req, res) => {
    try {
      const { phone, reference } = req.body;

      if (!phone || !reference) {
        return res.status(400).json({
          success: false,
          message: "Phone number and reference are required",
        });
      }

      const userSession = sessionManager.getSession(phone);

      if (!userSession) {
        return res.status(404).json({
          success: false,
          message: "User session not found",
        });
      }

      if (
        userSession.state !== USER_STATES.PAYMENT_PENDING &&
        userSession.state !== USER_STATES.AWAITING_PAYMENT
      ) {
        return res.status(400).json({
          success: false,
          message: "User is not in payment state",
        });
      }

      // Update payment reference and confirm
      userSession.data.payment_reference = reference;
      sessionManager.updateSession(phone, userSession);

      await conversationHandler.confirmPayment(phone, userSession);

      res.json({
        success: true,
        message: "Payment confirmed successfully",
      });
    } catch (error) {
      console.error("Manual payment confirmation error:", error);
      res.status(500).json({
        success: false,
        message: "Error confirming payment",
        error: error.message,
      });
    }
  });

  // Get payment status
  router.get("/status/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const userSession = sessionManager.getSession(phone);

      if (!userSession) {
        return res.status(404).json({
          success: false,
          message: "User session not found",
        });
      }

      const paymentStatus = {
        phone,
        email: userSession.data.email,
        state: userSession.state,
        payment_reference: userSession.data.payment_reference || null,
        payment_amount: userSession.data.payment_amount || null,
        is_payment_pending: userSession.state === USER_STATES.PAYMENT_PENDING,
        is_payment_awaiting: userSession.state === USER_STATES.AWAITING_PAYMENT,
        is_paid:
          userSession.state === USER_STATES.AWAITING_PITCH_VIDEO ||
          userSession.state === USER_STATES.COMPLETED,
      };

      res.json({
        success: true,
        data: paymentStatus,
      });
    } catch (error) {
      console.error("Payment status error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching payment status",
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = createPaymentRoutes;
