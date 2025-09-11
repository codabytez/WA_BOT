const axios = require("axios");
const config = require("../config");

class WhatsAppService {
  constructor() {
    this.version = config.whatsapp.version;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.accessToken = config.whatsapp.accessToken;
  }

  // Send WhatsApp message
  async sendMessage(to, message, messageType = "text") {
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
      console.error(
        "Error sending WhatsApp message:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Send welcome message
  async sendWelcomeMessage(to, username) {
    const message =
      `🌟 Hello ${username}! Welcome to our Kiya Loan Bot! 🌟\n\n` +
      "I'm here to help you apply for a business loan quickly and easily.\n\n" +
      "💡 *Helpful Commands:*\n" +
      "• Type 'cancel' or 'stop' to exit anytime\n" +
      "• Type 'help' for more commands\n" +
      "• Type 'status' to check your progress\n\n" +
      "To get started, please provide your email address:";

    return this.sendMessage(to, message);
  }

  // Send help menu
  async sendHelpMenu(to) {
    const helpMessage =
      "📱 Available Commands:\n\n" +
      "• *start* - Begin new application\n" +
      "• *restart* - Start over from beginning\n" +
      "• *cancel* - Cancel current application\n" +
      "• *stop* - Same as cancel\n" +
      "• *help* - Show this menu\n" +
      "• *status* - Check your current progress\n\n" +
      "You can use these commands at any time during the application process.";

    return this.sendMessage(to, helpMessage);
  }

  // Send status message
  async sendStatusMessage(to, currentStatus, progress, totalFields) {
    const message =
      `📊 Application Status:\n\n` +
      `Current Step: ${currentStatus}\n` +
      `Progress: ${progress}/${totalFields} fields completed\n\n` +
      `Type 'help' for available commands or continue where you left off.`;

    return this.sendMessage(to, message);
  }

  // Send cancellation message
  async sendCancellationMessage(to) {
    const message =
      "❌ Application cancelled successfully.\n\n" +
      "Your progress has been cleared. Don't worry, you can start over anytime!\n\n" +
      "Type 'start' when you're ready to begin a new application. 👍";

    return this.sendMessage(to, message);
  }

  // Send payment details
  async sendPaymentDetails(to, userSession) {
    const summary =
      `📋 Application Summary:\n\n` +
      `Name: ${userSession.data.first_name} ${userSession.data.last_name}\n` +
      `Email: ${userSession.data.email}\n` +
      `Phone: ${userSession.data.phone}\n` +
      `Business: ${userSession.data.business_name}\n` +
      `Duration: ${userSession.data.business_duration}\n` +
      `Loan Amount: ${userSession.data.loan_amount}\n` +
      `State: ${userSession.data.state_id}\n` +
      `Industry: ${userSession.data.industry}\n\n` +
      `💳 To proceed with your application, please make a payment of ₦${config.payment.amount}.\n\n` +
      `Payment Details:\n` +
      `Bank: ${config.payment.bank}\n` +
      `Account: ${config.payment.account}\n` +
      `Name: ${config.payment.accountName}\n\n` +
      `After payment, please send your transaction reference:`;

    return this.sendMessage(to, summary);
  }

  // Send completion message
  async sendCompletionMessage(to) {
    const message =
      "🎉 Congratulations! Your loan application has been submitted successfully!\n\n" +
      "📧 You'll receive a confirmation email shortly.\n" +
      "⏰ We'll review your application within 3-5 business days.\n" +
      "📞 Our team will contact you if additional information is needed.\n\n" +
      "Thank you for choosing us! 🙏";

    return this.sendMessage(to, message);
  }
}

module.exports = WhatsAppService;
