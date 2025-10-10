import axios from "axios";
import config from "../config";
import { MessageType, UserSession } from "../types";
import { AxiosError } from "axios";

class WhatsAppService {
  version: string | undefined;
  phoneNumberId: string | undefined;
  accessToken: string | undefined;

  constructor() {
    this.version = config.whatsapp.version;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.accessToken = config.whatsapp.accessToken;
  }

  // Send WhatsApp message
  async sendMessage(
    to: string,
    message: string | object,
    messageType: MessageType
  ) {
    try {
      const data =
        messageType === "text"
          ? { messaging_product: "whatsapp", to, text: { body: message } }
          : message; // For interactive messages

      const response = await axios({
        method: "POST",
        url: `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`,
        data,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Error sending WhatsApp message:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  // Send interactive message
  async sendInteractiveMessage(interactiveMessage: object) {
    try {
      const response = await axios({
        method: "POST",
        url: `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`,
        data: interactiveMessage,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Error sending interactive message:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  // Send welcome message
  async sendWelcomeMessage(
    to: string,
    username: string,
    messageType: MessageType
  ) {
    const message =
      `🌟 Hello ${username}! Welcome to our Kiya Loan Bot! 🌟\n\n` +
      "I'm here to help you apply for a business loan quickly and easily.\n\n" +
      "💡 *Helpful Commands:*\n" +
      "• Type 'cancel' or 'stop' to exit anytime\n" +
      "• Type 'help' for more commands\n" +
      "• Type 'status' to check your progress\n\n" +
      "To get started, please provide your email address:";

    return this.sendMessage(to, message, messageType);
  }

  // Send help menu
  async sendHelpMenu(to: string, messageType: MessageType): Promise<any> {
    const helpMessage: string =
      "📱 Available Commands:\n\n" +
      "• *start* - Begin new application\n" +
      "• *restart* - Start over from beginning\n" +
      "• *cancel* - Cancel current application\n" +
      "• *stop* - Same as cancel\n" +
      "• *help* - Show this menu\n" +
      "• *status* - Check your current progress\n\n" +
      "You can use these commands at any time during the application process.";

    return this.sendMessage(to, helpMessage, messageType);
  }

  // Send status message
  async sendStatusMessage(
    to: string,
    currentStatus: string,
    progress: number,
    totalFields: number,
    messageType: MessageType
  ) {
    const message =
      `📊 Application Status:\n\n` +
      `Current Step: ${currentStatus}\n` +
      `Progress: ${progress}/${totalFields} fields completed\n\n` +
      `Type 'help' for available commands or continue where you left off.`;

    return this.sendMessage(to, message, messageType);
  }

  // Send cancellation message
  async sendCancellationMessage(to: string, messageType: MessageType) {
    const message =
      "❌ Application cancelled successfully.\n\n" +
      "Your progress has been cleared. Don't worry, you can start over anytime!\n\n" +
      "Type 'start' when you're ready to begin a new application. 👍";

    return this.sendMessage(to, message, messageType);
  }

  // Send payment details with interactive button
  async sendPaymentDetails(
    to: string,
    userSession: UserSession,
    paymentLink: string
  ) {
    // Helper to format numbers with commas, handles string or number
    function formatNumber(num: string | undefined) {
      const n =
        typeof num === "string"
          ? Number(num.replace(/,/g, ""))
          : typeof num === "number"
          ? num
          : 0;
      return isNaN(n) ? num ?? "" : n.toLocaleString("en-NG");
    }

    const summary =
      `📋 Application Summary:\n\n` +
      `👤 Name: ${userSession.data.first_name} ${userSession.data.last_name}\n` +
      `📧 Email: ${userSession.data.email}\n` +
      `📱 Phone: ${userSession.data.phone}\n` +
      `🏢 Business: ${userSession.data.business_name}\n` +
      `📅 Duration: ${userSession.data.business_duration}\n` +
      `💰 Loan Amount: ${formatNumber(userSession.data.loan_amount)}\n` +
      `📍 Address: ${userSession.data.business_address}\n` +
      `🏭 Industry: ${userSession.data.industry}\n\n` +
      `💳 To proceed with your application, please make a payment of ₦${formatNumber(
        config.payment.amount
      )}.\n\n` +
      `Click the button below to pay securely online. You'll receive an automatic message with payment update.`;

    // Create interactive message with payment button
    const interactiveMessage = {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "cta_url",
        header: {
          type: "text",
          text: "💳 Payment Required",
        },
        body: {
          text: summary,
        },
        footer: {
          text: "Secure payment powered by Kiya",
        },
        action: {
          name: "cta_url",
          parameters: {
            display_text: "Pay Now",
            url: paymentLink,
          },
        },
      },
    };

    return this.sendInteractiveMessage(interactiveMessage);
  }

  async sendCompletionMessage(to: string, messageType: MessageType) {
    const message =
      "🎉 Congratulations! Your loan application has been submitted successfully!\n\n" +
      "📧 You'll receive a confirmation email shortly.\n" +
      "⏰ We'll review your application within 3-5 business days.\n" +
      "📞 Our team will contact you if additional information is needed.\n\n" +
      "Thank you for choosing us! 🙏";

    return this.sendMessage(to, message, messageType);
  }
}

export default WhatsAppService;
