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
        if (message.type === "text") {
          messageText = message.text.body;
        } else if (message.type === "video") {
          messageText = "video_uploaded";
        } else if (message.type === "document") {
          messageText = "document_uploaded";
        } else {
          messageText = message.type; // Handle other types
        }

        try {
          await this.conversationHandler.processUserInput(
            from,
            messageText,
            username,
            whatsappPhoneNumber
          );
        } catch (error) {
          console.error("Error processing user input:", error);
          // You could add error handling here to send error message to user
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
