const { USER_STATES, STATUS_MAP } = require("../constants/states");
const {
  isValidEmail,
  isValidPhone,
  isValidName,
} = require("../utils/validators");
const WhatsAppService = require("../services/whatsappService");
const ApiService = require("../services/apiService");

class ConversationHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.whatsappService = new WhatsAppService();
    this.apiService = new ApiService();
  }

  // Main method to process user input
  async processUserInput(from, message, username, whatsappPhoneNumber) {
    const userSession = this.sessionManager.getOrCreateSession(
      from,
      whatsappPhoneNumber
    );
    const currentMessage = message.toLowerCase().trim();

    // Handle global commands
    if (
      await this.handleGlobalCommands(
        from,
        currentMessage,
        userSession,
        username
      )
    ) {
      return;
    }

    // Process based on current state
    await this.handleStateBasedInput(from, message, userSession, username);
  }

  // Handle global commands (cancel, help, status, etc.)
  async handleGlobalCommands(from, currentMessage, userSession, username) {
    switch (currentMessage) {
      case "cancel":
      case "stop":
      case "quit":
      case "exit":
        await this.handleCancel(from, userSession);
        return true;

      case "restart":
      case "reset":
        await this.handleRestart(from, userSession, username);
        return true;

      case "help":
      case "menu":
        await this.whatsappService.sendHelpMenu(from);
        return true;

      case "status":
        await this.handleStatus(from, userSession);
        return true;

      default:
        return false;
    }
  }

  // Handle cancel command
  async handleCancel(from, userSession) {
    this.sessionManager.deleteSession(from);
    await this.whatsappService.sendCancellationMessage(from);
  }

  // Handle restart command
  async handleRestart(from, userSession, username) {
    this.sessionManager.deleteSession(from);
    const newSession = this.sessionManager.createSession(from);
    newSession.state = USER_STATES.AWAITING_EMAIL;
    this.sessionManager.updateSession(from, newSession);
    await this.whatsappService.sendWelcomeMessage(from, username);
  }

  // Handle status command
  async handleStatus(from, userSession) {
    const currentStatus = STATUS_MAP[userSession.state] || "Unknown status";
    const progress = Object.values(userSession.data).filter(
      (value) => value !== ""
    ).length;
    const totalFields = Object.keys(userSession.data).length;

    await this.whatsappService.sendStatusMessage(
      from,
      currentStatus,
      progress,
      totalFields
    );
  }

  // Handle state-based input
  async handleStateBasedInput(from, message, userSession, username) {
    switch (userSession.state) {
      case USER_STATES.INITIAL:
        await this.handleInitialState(from, message, userSession, username);
        break;

      case USER_STATES.AWAITING_EMAIL:
        await this.handleEmailState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_OTP:
        await this.handleOTPState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_FIRST_NAME:
        await this.handleFirstNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_LAST_NAME:
        await this.handleLastNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PHONE:
        await this.handlePhoneState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_BUSINESS_NAME:
        await this.handleBusinessNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_BUSINESS_DURATION:
        await this.handleBusinessDurationState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_CAC_NUMBER:
        await this.handleCACNumberState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_LOAN_AMOUNT:
        await this.handleLoanAmountState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_ADDRESS:
        await this.handleStateLocationState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_INDUSTRY:
        await this.handleIndustryState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_SOCIAL_MEDIA:
        await this.handleSocialMediaState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_REFERRAL:
        await this.handleReferralState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PAYMENT:
        await this.handlePaymentState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PITCH_VIDEO:
        await this.handlePitchVideoState(from, message, userSession);
        break;

      case USER_STATES.COMPLETED:
        await this.handleCompletedState(from);
        break;

      default:
        await this.whatsappService.sendMessage(
          from,
          "I didn't understand that. Type 'start' to begin a new application."
        );
    }
  }

  // Individual state handlers
  async handleInitialState(from, message, userSession, username) {
    const currentMessage = message.toLowerCase().trim();

    if (["hello", "hi", "start"].includes(currentMessage)) {
      await this.whatsappService.sendWelcomeMessage(from, username);
      userSession.state = USER_STATES.AWAITING_EMAIL;
      this.sessionManager.updateSession(from, userSession);
    } else {
      await this.whatsappService.sendMessage(
        from,
        `👋 Hello ${username}! Welcome to our Kiya Loan Bot!\n\n` +
          "Type 'start' to begin your application process.\n" +
          "Type 'help' to see available commands."
      );
    }
  }

  async handleEmailState(from, message, userSession) {
    if (!isValidEmail(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid email address (e.g., john@example.com):"
      );
      return;
    }

    try {
      const response = await this.apiService.submitEmail(message);

      if (response?.status) {
        userSession.data.email = message;
        await this.whatsappService.sendMessage(
          from,
          `✅ Great! I've sent a verification code to ${message}\n\n` +
            "Please enter the 6-digit OTP you received:"
        );
        userSession.state = USER_STATES.AWAITING_OTP;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Something went wrong. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Already verified → skip OTP
        userSession.data.email = message;
        await this.whatsappService.sendMessage(
          from,
          "✅ This email is already verified!\n\n" +
            "Let's continue your application.\n\n" +
            "What's your first name?"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          error.response?.data?.message ||
          "❌ Could not process your request. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    }
  }

  async handleOTPState(from, message, userSession) {
    try {
      const response = await this.apiService.verifyEmail(
        userSession.data.email,
        message
      );

      if (response?.status) {
        await this.whatsappService.sendMessage(
          from,
          "✅ Email verified successfully!\n\n" +
            "Now, let's collect your information.\n\n" +
            "What's your first name?"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Invalid OTP. Please enter the 6-digit code sent to your email:";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    } catch (error) {
      console.error("OTP verification error:", error.response?.data || error);
      const errorMsg =
        error.response?.data?.message ||
        "❌ Could not verify OTP. Please try again later.";
      await this.whatsappService.sendMessage(from, errorMsg);
    }
  }

  async handleFirstNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid first name (at least 2 characters):"
      );
      return;
    }

    userSession.data.first_name = message;
    await this.whatsappService.sendMessage(from, "What's your last name?");
    userSession.state = USER_STATES.AWAITING_LAST_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLastNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid last name (at least 2 characters):"
      );
      return;
    }

    userSession.data.last_name = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your phone number? (e.g., +2348012345678 or 08012345678):"
    );
    userSession.state = USER_STATES.AWAITING_PHONE;
    this.sessionManager.updateSession(from, userSession);
  }

  async handlePhoneState(from, message, userSession) {
    if (!isValidPhone(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678):"
      );
      return;
    }

    userSession.data.phone = message;
    await this.whatsappService.sendMessage(from, "What's your business name?");
    userSession.state = USER_STATES.AWAITING_BUSINESS_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid business name:"
      );
      return;
    }

    userSession.data.business_name = message;
    await this.whatsappService.sendMessage(
      from,
      "How long has your business been operating? (e.g., '2 years', '6 months'):"
    );
    userSession.state = USER_STATES.AWAITING_BUSINESS_DURATION;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessDurationState(from, message, userSession) {
    userSession.data.business_duration = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your CAC registration number? (Type 'skip' if not registered yet):"
    );
    userSession.state = USER_STATES.AWAITING_CAC_NUMBER;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleCACNumberState(from, message, userSession) {
    userSession.data.cac_number =
      message.toLowerCase() === "skip" ? "" : message;
    await this.whatsappService.sendMessage(
      from,
      "How much loan amount are you applying for? (e.g., ₦500,000):"
    );
    userSession.state = USER_STATES.AWAITING_LOAN_AMOUNT;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLoanAmountState(from, message, userSession) {
    userSession.data.loan_amount = message;
    await this.whatsappService.sendMessage(
      from,
      "Where is your business located? Please enter your business address:"
    );
    userSession.state = USER_STATES.AWAITING_ADDRESS;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleStateLocationState(from, message, userSession) {
    userSession.data.address = message;
    await this.whatsappService.sendMessage(
      from,
      "What industry is your business in? (e.g., Technology, Agriculture, Retail):"
    );
    userSession.state = USER_STATES.AWAITING_INDUSTRY;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleIndustryState(from, message, userSession) {
    userSession.data.industry = message;
    await this.whatsappService.sendMessage(
      from,
      "📱 Please share your social media handles (optional):\n\n" +
        "Format: Twitter: @handle, Instagram: @handle, Facebook: profile, LinkedIn: profile\n\n" +
        "Or type 'skip' to continue:"
    );
    userSession.state = USER_STATES.AWAITING_SOCIAL_MEDIA;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleSocialMediaState(from, message, userSession) {
    if (message.toLowerCase() !== "skip") {
      // Parse social media handles (basic parsing)
      const handles = message.split(",");
      handles.forEach((handle) => {
        const [platform, url] = handle.split(":").map((s) => s.trim());
        if (platform && url) {
          const platformLower = platform.toLowerCase();
          if (platformLower.includes("twitter")) userSession.data.twitter = url;
          if (platformLower.includes("instagram"))
            userSession.data.instagram = url;
          if (platformLower.includes("facebook"))
            userSession.data.facebook = url;
          if (platformLower.includes("linkedin"))
            userSession.data.linkedin = url;
        }
      });
    }

    await this.whatsappService.sendMessage(
      from,
      "How did you hear about us? (referral name or 'none'):"
    );
    userSession.state = USER_STATES.AWAITING_REFERRAL;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleReferralState(from, message, userSession) {
    userSession.data.referral = message.toLowerCase() === "none" ? "" : message;

    // Tell user it's submitting
    await this.whatsappService.sendMessage(
      from,
      "⏳ Submitting your application details, please wait..."
    );

    await this.whatsappService.sendPaymentDetails(from, userSession);

    // try {
    //   const response = await this.apiService.submitEntry(userSession.data);

    //   if (response?.status) {
    //     await this.whatsappService.sendPaymentDetails(from, userSession);
    //     userSession.state = USER_STATES.AWAITING_PAYMENT;
    //     this.sessionManager.updateSession(from, userSession);
    //   } else {
    //     const errorMsg =
    //       response?.message ||
    //       "❌ Could not submit your application. Please try again later.";
    //     await this.whatsappService.sendMessage(from, errorMsg);
    //   }
    // } catch (error) {
    //   const errorMsg =
    //     error.response?.data?.message ||
    //     "❌ Something went wrong while submitting. Please try again.";
    //   await this.whatsappService.sendMessage(from, errorMsg);
    // }
  }

  async handlePaymentState(from, message, userSession) {
    userSession.data.payment_reference = message;

    await this.whatsappService.sendMessage(
      from,
      "✅ Payment received! Thank you.\n\n" +
        "🎥 Final step: Please upload your pitch video.\n\n" +
        "Record a 1-2 minute video explaining:\n" +
        "• Your business idea\n" +
        "• How you'll use the loan\n" +
        "• Why you should be selected\n\n" +
        "Upload the video now:"
    );

    userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
    this.sessionManager.updateSession(from, userSession);
  }

  async handlePitchVideoState(from, message, userSession) {
    await this.whatsappService.sendCompletionMessage(from);
    console.log("Complete application:", userSession.data);

    userSession.state = USER_STATES.COMPLETED;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleCompletedState(from) {
    await this.whatsappService.sendMessage(
      from,
      "Your application has already been submitted. Our team will contact you soon!\n\n" +
        "Need help? Contact support at helpdesk@kiakia.co."
    );
  }
}

module.exports = ConversationHandler;
