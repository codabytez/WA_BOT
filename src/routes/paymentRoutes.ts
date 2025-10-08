import express from "express";
import { USER_STATES } from "../constants/states";
import SessionManager from "../services/sessionManager";
import ConversationHandler from "../handlers/conversionHandler";
import { AxiosError } from "axios";

// Payment webhook routes factory
function createPaymentRoutes(
  sessionManager: SessionManager,
  conversationHandler: ConversationHandler
) {
  const router = express.Router();

  // Handle payment webhook from payment processor
  router.post("/webhook", async (req, res) => {
    try {
      const { event, data } = req.body;
      console.log("Payment webhook event:", event);
      console.log("Payment webhook data:", data);

      // Log the webhook for debugging
      console.log(
        "Payment webhook received:",
        JSON.stringify(req.body, null, 2)
      );

      // Validate webhook payload
      if (!event || !data) {
        return res.status(400).json({
          status: "error",
          message: "Invalid webhook payload",
        });
      }

      // Handle successful payment
      if (event === "payment.success" || event === "charge.success") {
        const { email, phone, reference, amount } = data;

        if (!email) {
          return res.status(400).json({
            status: "error",
            message: "Email is required in webhook data",
          });
        }

        // Find user session by email and payment state
        const sessions = sessionManager.getAllSessions();
        const userSession = sessions.find(
          (session) =>
            session.data.email === email &&
            (session.state === USER_STATES.PAYMENT_PENDING ||
              session.state === USER_STATES.AWAITING_PAYMENT)
        );

        if (userSession) {
          // Update payment details
          userSession.data.payment_reference = reference;
          userSession.data.payment_amount = amount;
          userSession.data.payment_status = "confirmed";
          sessionManager.updateSession(userSession.phone, userSession);

          // Confirm payment and notify user
          await conversationHandler.confirmPayment(
            userSession.phone,
            userSession
          );

          console.log(`✅ Payment confirmed for user: ${email}`);

          return res.status(200).json({
            status: "success",
            message: "Payment processed and user notified",
          });
        } else {
          console.log(
            `⚠️ No pending payment session found for email: ${email}`
          );

          // If we have a phone number, try to find by phone
          if (phone) {
            const phoneSession = sessionManager.getSession(phone);
            if (phoneSession && phoneSession.data.email === email) {
              phoneSession.data.payment_reference = reference;
              phoneSession.data.payment_amount = amount;
              phoneSession.data.payment_status = "confirmed";
              sessionManager.updateSession(phone, phoneSession);

              await conversationHandler.confirmPayment(phone, phoneSession);

              console.log(`✅ Payment confirmed for user via phone: ${phone}`);

              return res.status(200).json({
                status: "success",
                message: "Payment processed via phone lookup",
              });
            }
          }

          return res.status(404).json({
            status: "warning",
            message: "No active payment session found for this user",
          });
        }
      }

      // Handle failed payment
      else if (event === "payment.failed" || event === "charge.failed") {
        const { email, reference } = data;

        if (!email) {
          return res.status(400).json({
            status: "error",
            message: "Email is required in webhook data",
          });
        }

        // Find user session by email
        const sessions = sessionManager.getAllSessions();
        const userSession = sessions.find(
          (session) =>
            session.data.email === email &&
            (session.state === USER_STATES.AWAITING_PAYMENT ||
              session.state === USER_STATES.PAYMENT_PENDING)
        );

        if (userSession) {
          // Update payment status
          userSession.data.payment_status = "failed";
          userSession.data.payment_reference = reference;

          // Notify user about failed payment
          await conversationHandler.whatsappService.sendMessage(
            userSession.phone,
            "❌ Payment failed. Please try again or contact support.\n\n" +
              "You can:\n" +
              "• Try the payment link again\n" +
              "• Contact support for assistance at helpdesk@kiakia.co",
            "text"
          );

          // Reset to payment state
          userSession.state = USER_STATES.AWAITING_PAYMENT;
          sessionManager.updateSession(userSession.phone, userSession);

          console.log(`❌ Payment failed for user: ${email}`);

          return res.status(200).json({
            status: "success",
            message: "Payment failure processed and user notified",
          });
        }

        console.log(`⚠️ No session found for failed payment: ${email}`);

        return res.status(404).json({
          status: "warning",
          message: "No active session found for failed payment",
        });
      }

      // Handle pending payment
      else if (event === "payment.pending" || event === "charge.pending") {
        const { email, reference } = data;

        if (!email) {
          return res.status(400).json({
            status: "error",
            message: "Email is required in webhook data",
          });
        }

        const sessions = sessionManager.getAllSessions();
        const userSession = sessions.find(
          (session) =>
            session.data.email === email &&
            session.state === USER_STATES.AWAITING_PAYMENT
        );

        if (userSession) {
          userSession.data.payment_reference = reference;
          userSession.data.payment_status = "pending";
          userSession.state = USER_STATES.PAYMENT_PENDING;
          sessionManager.updateSession(userSession.phone, userSession);

          await conversationHandler.whatsappService.sendMessage(
            userSession.phone,
            "⏳ Your payment is being processed. We'll notify you once it's confirmed.\n\n" +
              "This usually takes a few moments.",
            "text"
          );

          console.log(`⏳ Payment pending for user: ${email}`);

          return res.status(200).json({
            status: "success",
            message: "Payment pending status updated",
          });
        }

        return res.status(404).json({
          status: "warning",
          message: "No active session found for pending payment",
        });
      }

      // Unknown event type
      else {
        console.log(`⚠️ Unknown webhook event: ${event}`);
        return res.status(200).json({
          status: "success",
          message: "Webhook received but event type not handled",
        });
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Payment webhook error:", err);
      return res.status(500).json({
        status: "error",
        message: "Webhook processing failed",
        error: err.message,
      });
    }
  });

  // Manual payment confirmation endpoint (for admin use only)
  router.post("/confirm", async (req, res) => {
    try {
      console.log("Manual payment confirmation request:", req.body);

      const { phone, email } = req.body;

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: "Phone number or email is required",
        });
      }

      let userSession;
      if (phone) {
        userSession = sessionManager.getSession(phone);
      } else if (email) {
        const sessions = sessionManager.getAllSessions();
        userSession = sessions.find((session) => session.data.email === email);
      }

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
          currentState: userSession.state,
        });
      }

      // Manually confirm payment
      userSession.data.payment_status = "confirmed";
      userSession.data.payment_reference =
        req.body.reference || "MANUAL_CONFIRMATION";
      sessionManager.updateSession(userSession.data.phone, userSession);

      await conversationHandler.confirmPayment(
        userSession.data.phone,
        userSession
      );

      return res.json({
        success: true,
        message: "Payment confirmed manually",
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Manual payment confirmation error:", err);
      return res.status(500).json({
        success: false,
        message: "Error confirming payment",
        error: err.message,
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
        payment_status: userSession.data.payment_status || "not_started",
        payment_reference: userSession.data.payment_reference || null,
        payment_amount: userSession.data.payment_amount || null,
        is_payment_pending: userSession.state === USER_STATES.PAYMENT_PENDING,
        is_payment_awaiting: userSession.state === USER_STATES.AWAITING_PAYMENT,
        is_paid:
          userSession.data.payment_status === "confirmed" ||
          userSession.state === USER_STATES.AWAITING_PITCH_VIDEO ||
          userSession.state === USER_STATES.COMPLETED,
      };

      return res.json({
        success: true,
        data: paymentStatus,
      });
    } catch (error) {
      const err = error as AxiosError;
      console.error("Payment status error:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching payment status",
        error: err.message,
      });
    }
  });

  // Debug route to list all registered routes
  router.get("/debug/routes", (_, res) => {
    res.json({
      success: true,
      routes: [
        "POST /payment/webhook - Handle payment processor webhooks",
        "POST /payment/confirm - Manual payment confirmation (admin only)",
        "GET /payment/status/:phone - Get payment status for a user",
        "GET /payment/debug/routes - List all payment routes",
      ],
    });
  });

  return router;
}

export default createPaymentRoutes;
