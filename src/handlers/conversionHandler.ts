import { USER_STATES, STATUS_MAP } from "../constants/states";
import { isValidEmail, isValidPhone, isValidName } from "../utils/validators";
import {
  createIndustrySelectionMessage,
  createBusinessDurationSelectionMessage,
  createLoanAmountSelectionMessage,
  getIndustryDisplayName,
  getBusinessDurationDisplayName,
  getLoanAmountDisplayName,
  isValidIndustryId,
  isValidBusinessDurationId,
  isValidLoanAmountId,
} from "../utils/interactiveMessages";
import WhatsAppService from "../services/whatsappService";
import ApiService from "../services/apiService";
import { UserSession, InteractiveData, MessageType } from "../types";
import SessionManager from "../services/sessionManager";
import { AxiosError } from "axios";

class ConversationHandler {
  sessionManager: SessionManager;
  whatsappService: WhatsAppService;
  apiService: ApiService;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.whatsappService = new WhatsAppService();
    this.apiService = new ApiService();
  }

  // Main method to process user input
  async processUserInput(
    from: string,
    message: string,
    username: string,
    whatsappPhoneNumber: string,
    messageType: MessageType,
    interactiveData?: InteractiveData,
    media_id?: string
  ) {
    const userSession = this.sessionManager.getOrCreateSession(
      from,
      whatsappPhoneNumber
    );

    // console.log("Processing input:", message);
    const currentMessage = message.toLowerCase().trim();

    // Handle interactive responses
    if (messageType === "interactive" && interactiveData) {
      await this.handleInteractiveResponse(from, interactiveData, userSession);
      return;
    }

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
    await this.handleStateBasedInput(
      from,
      message,
      username,
      messageType,
      userSession,
      media_id
    );
  }

  // Handle interactive responses (button/list selections)
  async handleInteractiveResponse(
    from: string,
    interactiveData: InteractiveData,
    userSession: UserSession
  ) {
    const selectedId = interactiveData.id;

    switch (userSession.state) {
      case USER_STATES.AWAITING_BUSINESS_DURATION:
        if (isValidBusinessDurationId(selectedId)) {
          userSession.data.business_duration =
            getBusinessDurationDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "What's your CAC registration number? (Type 'skip' if not registered yet):",
            "text"
          );
          userSession.state = USER_STATES.AWAITING_CAC_NUMBER;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      case USER_STATES.AWAITING_LOAN_AMOUNT:
        if (isValidLoanAmountId(selectedId)) {
          userSession.data.loan_amount = getLoanAmountDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "What is your business address? (Street, City, State)",
            "text"
          );
          userSession.state = USER_STATES.AWAITING_BUSINESS_ADDRESS;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      case USER_STATES.AWAITING_INDUSTRY:
        if (isValidIndustryId(selectedId)) {
          userSession.data.industry = getIndustryDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "📱 Please share your social media handles (optional):\n\n" +
              "Format: Twitter: @handle, Instagram: @handle, Facebook: profile, LinkedIn: profile\n\n" +
              "Or type 'skip' to continue:",
            "text"
          );
          userSession.state = USER_STATES.AWAITING_SOCIAL_MEDIA;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      default:
        // If we receive an interactive response in an unexpected state, ignore it
        await this.whatsappService.sendMessage(
          from,
          "I didn't expect that selection right now. Please continue with your application.",
          "text"
        );
    }
  }

  // Handle global commands (cancel, help, status, etc.)
  async handleGlobalCommands(
    from: string,
    currentMessage: string,
    userSession: UserSession,
    username: string
  ) {
    switch (currentMessage) {
      case "cancel":
      case "stop":
      case "quit":
      case "exit":
        await this.handleCancel(from);
        return true;

      case "restart":
      case "reset":
        await this.handleRestart(from, userSession, username);
        return true;

      case "help":
      case "menu":
        await this.whatsappService.sendHelpMenu(from, "text");
        return true;

      case "status":
        await this.handleStatus(from, userSession, "text");
        return true;

      default:
        return false;
    }
  }

  // Handle cancel command
  async handleCancel(from: string) {
    this.sessionManager.deleteSession(from);
    await this.whatsappService.sendCancellationMessage(from, "text");
  }

  // Handle restart command
  async handleRestart(
    from: string,
    userSession: UserSession,
    username: string
  ) {
    this.sessionManager.deleteSession(from);
    const newSession = this.sessionManager.createSession(
      from,
      userSession.data.whatsapp_number
    );
    newSession.state = USER_STATES.AWAITING_EMAIL;
    this.sessionManager.updateSession(from, newSession);
    await this.whatsappService.sendWelcomeMessage(from, username, "text");
  }

  // Handle status command
  async handleStatus(
    from: string,
    userSession: UserSession,
    messageType: MessageType
  ) {
    const currentStatus =
      STATUS_MAP[userSession.state as keyof typeof STATUS_MAP] ||
      "Unknown status";
    const progress = Object.values(userSession.data).filter(
      (value) => value !== ""
    ).length;
    const totalFields = Object.keys(userSession.data).length;

    await this.whatsappService.sendStatusMessage(
      from,
      currentStatus,
      progress,
      totalFields,
      messageType
    );
  }

  async handleStateBasedInput(
    from: string,
    message: string,
    username: string,
    messageType: MessageType,
    userSession: UserSession,
    media_id?: string
  ) {
    switch (userSession.state) {
      case USER_STATES.INITIAL:
        await this.handleInitialState(
          from,
          message,
          userSession,
          username,
          messageType
        );
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
        await this.handleBusinessDurationState(from);
        break;

      case USER_STATES.AWAITING_CAC_NUMBER:
        await this.handleCACNumberState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_LOAN_AMOUNT:
        await this.handleLoanAmountState(from);
        break;

      case USER_STATES.AWAITING_BUSINESS_ADDRESS:
        await this.handleStateLocationState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_INDUSTRY:
        await this.handleIndustryState(from);
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

      case USER_STATES.PAYMENT_PENDING:
        await this.handlePaymentPendingState(from, message);
        break;

      case USER_STATES.AWAITING_PITCH_VIDEO:
        await this.handlePitchVideoState(
          from,
          media_id,
          userSession,
          messageType
        );
        break;

      case USER_STATES.COMPLETED:
        await this.handleCompletedState(from);
        break;

      default:
        await this.whatsappService.sendMessage(
          from,
          "I didn't understand that. Type 'start' to begin a new application.",
          "text"
        );
    }
  }

  // Individual state handlers
  async handleInitialState(
    from: string,
    message: string,
    userSession: UserSession,
    username: string,
    messageType: MessageType
  ) {
    const currentMessage = message.toLowerCase().trim();

    if (["hello", "hi", "start"].includes(currentMessage)) {
      await this.whatsappService.sendWelcomeMessage(
        from,
        username,
        messageType
      );
      userSession.state = USER_STATES.AWAITING_EMAIL;
      this.sessionManager.updateSession(from, userSession);
    } else {
      await this.whatsappService.sendMessage(
        from,
        `👋 Hello ${username}! Welcome to our Kiya Loan Bot!\n\n` +
          "Type 'start' to begin your application process.\n" +
          "Type 'help' to see available commands.",
        "text"
      );
    }
  }

  // Add this method to your ConversationHandler class

  async handleEmailState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    if (!isValidEmail(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid email address (e.g., john@example.com):",
        "text"
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
            "Please enter the 6-digit OTP you received:",
          "text"
        );
        userSession.state = USER_STATES.AWAITING_OTP;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Something went wrong. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg, "text");
      }
    } catch (error) {
      const err = error as AxiosError;

      if (err.response?.status === 409) {
        // Email already exists - determine where to route user
        const existingData = (err.response?.data as any)?.data;

        if (!existingData) {
          await this.whatsappService.sendMessage(
            from,
            "❌ Could not retrieve your existing data. Please contact support.",
            "text"
          );
          return;
        }

        // Store email in session
        userSession.data.email = message;

        // Route based on existing data
        await this.routeUserBasedOnExistingData(
          from,
          userSession,
          existingData
        );
      } else {
        const errorMsg =
          (err?.response?.data as { message?: string })?.message ||
          "❌ Could not process your request. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg, "text");
      }
    }
  }

  // New method to handle routing based on existing data
  async routeUserBasedOnExistingData(
    from: string,
    userSession: UserSession,
    existingData: any
  ) {
    // Check 1: Email not verified
    if (!existingData.email_verified_at) {
      await this.whatsappService.sendMessage(
        from,
        "✅ Email found but not verified!\n\n" +
          "I've sent a verification code to your email.\n\n" +
          "Please enter the 6-digit OTP you received:",
        "text"
      );
      userSession.state = USER_STATES.AWAITING_OTP;
      this.sessionManager.updateSession(from, userSession);
      return;
    }

    // Check 2: Missing basic personal info (first_name, last_name, business_name)
    if (
      !existingData.first_name ||
      !existingData.last_name ||
      !existingData.business_name
    ) {
      await this.whatsappService.sendMessage(
        from,
        "✅ Welcome back! Your email is verified.\n\n" +
          "Let's continue your application.\n\n" +
          "What's your first name?",
        "text"
      );

      // Pre-fill any existing data
      if (existingData.first_name)
        userSession.data.first_name = existingData.first_name;
      if (existingData.last_name)
        userSession.data.last_name = existingData.last_name;
      if (existingData.phone) userSession.data.phone = existingData.phone;
      if (existingData.business_name)
        userSession.data.business_name = existingData.business_name;

      userSession.state = USER_STATES.AWAITING_FIRST_NAME;
      this.sessionManager.updateSession(from, userSession);
      return;
    }

    // Check 3: All info filled but payment not made (paid = 0)
    if (existingData.paid === 0) {
      // Pre-fill all existing data
      this.prefillUserSessionData(userSession, existingData);

      try {
        // Generate payment link
        const paymentResponse = await this.apiService.getPaymentLink(
          existingData.email
        );

        if (paymentResponse?.status && paymentResponse?.data?.payment_link) {
          await this.whatsappService.sendMessage(
            from,
            "✅ Welcome back! Your application details are saved.\n\n" +
              "You need to complete your payment to proceed.\n\n" +
              "Click the link below to make payment:",
            "text"
          );

          await this.whatsappService.sendPaymentDetails(
            from,
            userSession,
            paymentResponse?.data?.payment_link
          );

          userSession.state = USER_STATES.AWAITING_PAYMENT;
          this.sessionManager.updateSession(from, userSession);
        } else {
          await this.whatsappService.sendMessage(
            from,
            "❌ Could not generate payment link. Please try again later or contact support.",
            "text"
          );
        }
      } catch (paymentError) {
        console.error("Payment link error:", paymentError);
        await this.whatsappService.sendMessage(
          from,
          "❌ Could not generate payment link. Please try again later or contact support.",
          "text"
        );
      }
      return;
    }

    // Check 4: Payment made but no pitch video (whatsapp_media_id is null)
    if (existingData.paid === 1 && !existingData.whatsapp_media_id) {
      // Pre-fill all existing data
      this.prefillUserSessionData(userSession, existingData);

      await this.whatsappService.sendMessage(
        from,
        "✅ Welcome back! Your application has been submitted and payment received.\n\n" +
          "📹 Final Step: Upload Your Pitch Video\n\n" +
          "Please send your pitch video directly in this chat. Make sure it clearly explains:\n" +
          "• Your business and what you do\n" +
          "• Why you need the loan\n" +
          "• How you plan to use the funds\n\n" +
          "You can send the video now! 🎥",
        "text"
      );

      userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
      this.sessionManager.updateSession(from, userSession);
      return;
    }

    // Check 5: Everything complete
    if (existingData.paid === 1 && existingData.whatsapp_media_id) {
      await this.whatsappService.sendMessage(
        from,
        "✅ Your application is already complete!\n\n" +
          "Our team will review your application and get back to you soon.\n\n" +
          "If you need any assistance, feel free to contact support at helpdesk@kiakia.co.\n\n" +
          "Type 'help' for available commands.",
        "text"
      );

      userSession.state = USER_STATES.COMPLETED;
      this.sessionManager.updateSession(from, userSession);
      return;
    }

    // Fallback - shouldn't reach here
    await this.whatsappService.sendMessage(
      from,
      "✅ Welcome back! Let's continue your application.\n\n" +
        "What's your first name?",
      "text"
    );
    userSession.state = USER_STATES.AWAITING_FIRST_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  // Helper method to prefill user session data from API response
  private prefillUserSessionData(userSession: UserSession, existingData: any) {
    if (existingData.first_name)
      userSession.data.first_name = existingData.first_name;
    if (existingData.last_name)
      userSession.data.last_name = existingData.last_name;
    if (existingData.phone) userSession.data.phone = existingData.phone;
    if (existingData.business_name)
      userSession.data.business_name = existingData.business_name;
    if (existingData.business_duration)
      userSession.data.business_duration = existingData.business_duration;
    if (existingData.cac_number)
      userSession.data.cac_number = existingData.cac_number;
    if (existingData.loan_amount)
      userSession.data.loan_amount = existingData.loan_amount;
    if (existingData.amount_in_words)
      userSession.data.loan_amount = existingData.amount_in_words;
    if (existingData.business_address)
      userSession.data.business_address = existingData.business_address;
    if (existingData.industry)
      userSession.data.industry = existingData.industry;
    if (existingData.twitter) userSession.data.twitter = existingData.twitter;
    if (existingData.instagram)
      userSession.data.instagram = existingData.instagram;
    if (existingData.facebook)
      userSession.data.facebook = existingData.facebook;
    if (existingData.linkedin)
      userSession.data.linkedin = existingData.linkedin;
    if (existingData.referral)
      userSession.data.referral = existingData.referral;
    if (existingData.payment_reference)
      userSession.data.payment_reference = existingData.payment_reference;
    if (existingData.paid === 1) userSession.data.payment_status = "confirmed";
  }

  async handleOTPState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
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
            "What's your first name?",
          "text"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Invalid OTP. Please enter the 6-digit code sent to your email:";
        await this.whatsappService.sendMessage(from, errorMsg, "text");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("OTP verification error:", err.response?.data || err);
      const errorMsg =
        (err?.response?.data as { message?: string })?.message ||
        "❌ Could not verify OTP. Please try again later.";
      await this.whatsappService.sendMessage(from, errorMsg, "text");
    }
  }

  async handleFirstNameState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid first name (at least 2 characters):",
        "text"
      );
      return;
    }

    userSession.data.first_name = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your last name?",
      "text"
    );
    userSession.state = USER_STATES.AWAITING_LAST_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLastNameState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid last name (at least 2 characters):",
        "text"
      );
      return;
    }

    userSession.data.last_name = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your phone number? (e.g., +2348012345678 or 08012345678):",
      "text"
    );
    userSession.state = USER_STATES.AWAITING_PHONE;
    this.sessionManager.updateSession(from, userSession);
  }

  async handlePhoneState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    if (!isValidPhone(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678):",
        "text"
      );
      return;
    }

    userSession.data.phone = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your business name?",
      "text"
    );
    userSession.state = USER_STATES.AWAITING_BUSINESS_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessNameState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid business name:",
        "text"
      );
      return;
    }

    userSession.data.business_name = message;

    // Send interactive message for business duration selection
    const interactiveMessage = createBusinessDurationSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    userSession.state = USER_STATES.AWAITING_BUSINESS_DURATION;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessDurationState(from: string) {
    // Send interactive message for business duration selection
    const interactiveMessage = createBusinessDurationSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleCACNumberState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    userSession.data.cac_number =
      message.toLowerCase() === "skip" ? "" : message;

    // Send interactive message for loan amount selection
    const interactiveMessage = createLoanAmountSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    userSession.state = USER_STATES.AWAITING_LOAN_AMOUNT;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLoanAmountState(from: string) {
    // Send interactive message for loan amount selection
    const interactiveMessage = createLoanAmountSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleStateLocationState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    userSession.data.business_address = message;

    // Send interactive message for industry selection
    const interactiveMessage = createIndustrySelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    userSession.state = USER_STATES.AWAITING_INDUSTRY;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleIndustryState(from: string) {
    // Send interactive message for industry selection
    const interactiveMessage = createIndustrySelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleSocialMediaState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
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
      "How did you hear about us? (referral name or 'none'):",
      "text"
    );
    userSession.state = USER_STATES.AWAITING_REFERRAL;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleReferralState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    userSession.data.referral = message.toLowerCase() === "none" ? "" : message;

    // Tell user it's submitting
    await this.whatsappService.sendMessage(
      from,
      "⏳ Submitting your application details, please wait...",
      "text"
    );

    try {
      // Submit entry to backend
      const response = await this.apiService.submitEntry(userSession.data);

      if (response.data?.status) {
        // Get payment link
        try {
          const paymentResponse = await this.apiService.getPaymentLink(
            userSession.data.email
          );

          if (paymentResponse?.status && paymentResponse?.data?.payment_link) {
            // Send payment details with payment button
            await this.whatsappService.sendPaymentDetails(
              from,
              userSession,
              paymentResponse?.data?.payment_link
            );
          } else {
            // Fallback to an error message
            await this.whatsappService.sendMessage(
              from,
              "❌ Could not generate payment link. Please try again later or contact support.",
              "text"
            );
          }
        } catch (paymentError) {
          console.error("Payment link error:", paymentError);
          // Fallback to an error message
          await this.whatsappService.sendMessage(
            from,
            "❌ Could not generate payment link. Please try again later or contact support.",
            "text"
          );
        }

        userSession.state = USER_STATES.AWAITING_PAYMENT;
        this.sessionManager.updateSession(from, userSession);
      } else {
        if (response.status === 201) {
          //Payment has already been made for this entry
          await this.whatsappService.sendMessage(
            from,
            "✅ Your application has already been submitted and payment received! Please proceed to upload your pitch video.\n\n" +
              "You can upload your pitch video by sending it directly here in this chat.",
            "text"
          );
          userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
          this.sessionManager.updateSession(from, userSession);
          return;
        }
        const errorMsg =
          response?.data?.message ||
          "❌ Could not submit your application. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg, "text");
      }
    } catch (error) {
      const err = error as AxiosError;
      const errorMsg =
        (err?.response?.data as { message?: string })?.message ||
        "❌ Something went wrong while submitting. Please try again.";
      await this.whatsappService.sendMessage(from, errorMsg, "text");
    }
  }

  async handlePaymentState(
    from: string,
    message: string,
    userSession: UserSession
  ) {
    const currentMessage = message.toLowerCase().trim();

    // Check if user wants to check payment status
    if (
      currentMessage === "check payment" ||
      currentMessage === "payment status"
    ) {
      const paymentStatus = userSession.data.payment_status || "pending";

      if (paymentStatus === "confirmed") {
        await this.whatsappService.sendMessage(
          from,
          "✅ Your payment has been confirmed!\n\n" +
            "Please proceed to upload your pitch video.",
          "text"
        );
      } else if (paymentStatus === "pending") {
        await this.whatsappService.sendMessage(
          from,
          "⏳ Your payment is still being processed. We'll notify you once it's confirmed.\n\n" +
            "This usually takes a few moments.",
          "text"
        );
      } else {
        await this.whatsappService.sendMessage(
          from,
          "⏳ Waiting for payment confirmation.\n\n" +
            "Please complete your payment using the link provided earlier.\n\n" +
            "Once payment is successful, you'll automatically receive a confirmation.",
          "text"
        );
      }
      return;
    }
    // Inform user that payment is automatic
    await this.whatsappService.sendMessage(
      from,
      "⏳ Waiting for payment confirmation.\n\n" +
        "Please complete your payment using the link provided earlier.\n\n" +
        "✅ You'll receive an automatic confirmation once payment is successful.\n\n" +
        "Type 'check payment' to see your current payment status.\n" +
        "If you need help, type 'help'.",
      "text"
    );
  }
  // Handle payment pending state
  async handlePaymentPendingState(from: string, message: string) {
    const currentMessage = message.toLowerCase().trim();

    if (
      currentMessage === "check payment" ||
      currentMessage === "payment status"
    ) {
      await this.whatsappService.sendMessage(
        from,
        "⏳ Your payment is being processed. We'll notify you once it's confirmed.\n\n" +
          "This usually takes a few moments. Please be patient.",
        "text"
      );
      return;
    }

    await this.whatsappService.sendMessage(
      from,
      "⏳ Your payment is still being processed. Please wait for confirmation.\n\n" +
        "You'll receive an automatic notification once payment is verified.\n\n" +
        "Type 'check payment' to see your current status.",
      "text"
    );
  }

  async handlePitchVideoState(
    from: string,
    media_id: string | undefined,
    userSession: UserSession,
    messageType: MessageType
  ) {
    console.log("user session:", userSession);
    console.log("Received media_id for pitch video:", media_id);
    console.log("Message type:", messageType);

    // Check if message type is video or document
    if (
      !messageType ||
      (messageType !== "video" && messageType !== "document")
    ) {
      await this.whatsappService.sendMessage(
        from,
        "⚠️ Please upload your pitch video as a video or document file.\n\n" +
          "📹 Accepted formats:\n" +
          "• Video files (MP4, MOV, AVI, etc.)\n" +
          "• Document files (if your video is compressed)\n\n" +
          "Please send your pitch video now.",
        "text"
      );
      return;
    }

    // Check if media_id exists
    if (!media_id) {
      await this.whatsappService.sendMessage(
        from,
        "❌ No media file detected. Please upload your pitch video by sending it directly here in this chat.\n\n" +
          "If you need help, type 'help' for assistance.",
        "text"
      );
      return;
    }

    try {
      // Show processing message
      await this.whatsappService.sendMessage(
        from,
        "⏳ Uploading your pitch video, please wait...",
        "text"
      );

      const response = await this.apiService.uploadPitchVideo(
        userSession.data.email,
        media_id
      );

      if (response?.status) {
        await this.whatsappService.sendMessage(
          from,
          "✅ Pitch video received! Thank you for your submission.\n\n" +
            "Our team will review your application and get back to you soon.\n\n" +
            "If you need any assistance, feel free to contact support at helpdesk@kiakia.co.",
          "text"
        );

        userSession.state = USER_STATES.COMPLETED;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Could not upload your pitch video. Please try again.";
        await this.whatsappService.sendMessage(from, errorMsg, "text");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Pitch video upload error:", err.response?.data || err);

      const errorMsg =
        (err?.response?.data as { message?: string })?.message ||
        "❌ Could not upload your pitch video. Please try again.";
      await this.whatsappService.sendMessage(from, errorMsg, "text");
    }
  }

  // Confirm payment (called automatically from webhook)
  async confirmPayment(from: string, userSession: UserSession) {
    try {
      // Verify that payment reference exists (set by webhook)
      if (!userSession.data.payment_reference) {
        console.error(`No payment reference found for ${from}`);
        await this.whatsappService.sendMessage(
          from,
          "❌ Payment verification failed. Please contact support at helpdesk@kiakia.co",
          "text"
        );
        return;
      }

      // Payment confirmed - notify user
      const amount = userSession.data.payment_amount
        ? `₦${userSession.data.payment_amount.toLocaleString()}`
        : "";

      const reference = userSession.data.payment_reference;

      await this.whatsappService.sendMessage(
        from,
        `✅ Payment Confirmed Successfully! 🎉\n\n` +
          `${amount ? `Amount Paid: ${amount}\n` : ""}` +
          `Reference: ${reference}\n\n` +
          `Thank you for your payment. Your application is now active.\n\n` +
          `📹 Next Step: Upload Your Pitch Video\n\n` +
          `Please send your pitch video directly in this chat. ` +
          `Make sure it clearly explains:\n` +
          `• Your business and what you do\n` +
          `• Why you need the loan\n` +
          `• How you plan to use the funds\n\n` +
          `You can send the video now! 🎥`,
        "text"
      );

      // Move to pitch video state
      userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
      userSession.data.payment_confirmed_at = new Date().toISOString();
      this.sessionManager.updateSession(from, userSession);

      console.log(`✅ Payment confirmed for ${from} - Reference: ${reference}`);
    } catch (error) {
      console.error("Error in confirmPayment:", error);
      await this.whatsappService.sendMessage(
        from,
        "❌ There was an error processing your payment confirmation. " +
          "Please contact support at helpdesk@kiakia.co",
        "text"
      );
    }
  }

  // Handle completed state
  async handleCompletedState(from: string) {
    await this.whatsappService.sendMessage(
      from,
      "Your application has already been submitted. Our team will contact you soon!\n\n" +
        "Need help? Contact support at helpdesk@kiakia.co.",
      "text"
    );
  }
}

export default ConversationHandler;
