const ConversationHandler = require("./conversionHandler");

class WebhookHandler {
  constructor(sessionManager) {
    this.conversationHandler = new ConversationHandler(sessionManager);
  }

  // Handle incoming webhook events
  async handleWebhook(req, res) {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages
      ) {
        const from = body.entry[0].changes[0].value.messages[0].from;
        const message = body.entry[0].changes[0].value.messages[0];
        const username =
          body.entry[0].changes[0].value.contacts[0].profile.name;
        const whatsappPhoneNumber =
          body.entry[0].changes[0].value.contacts[0].wa_id;

        // Handle different message types
        let messageText = "";
        let messageType = "text";

        if (message.type === "text") {
          messageText = message.text.body;
          messageType = "text";
        } else if (message.type === "interactive") {
          // Handle interactive responses (button clicks, list selections)
          messageText = message.interactive;
          messageType = "interactive";
        } else if (message.type === "video") {
          messageText = "video_uploaded";
          messageType = "media";
        } else if (message.type === "document") {
          messageText = "document_uploaded";
          messageType = "media";
        } else {
          messageText = message.type;
          messageType = "other";
        }

        try {
          await this.conversationHandler.processUserInput(
            from,
            messageText,
            username,
            whatsappPhoneNumber,
            messageType
          );
        } catch (error) {
          console.error("Error processing user input:", error);
          // Send error message to user
          const WhatsAppService = require("../services/whatsappService");
          const whatsappService = new WhatsAppService();
          await whatsappService.sendMessage(
            from,
            "Sorry, I encountered an error processing your request. Please try again or contact support."
          );
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  }

  // Handle webhook verification
  handleWebhookVerification(req, res) {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const token = req.query["hub.verify_token"];
    const { verifyToken } = require("../config").whatsapp;

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  }
}

module.exports = WebhookHandler;
