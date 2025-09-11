const { USER_STATES } = require("../constants/states");

class SessionManager {
  constructor() {
    // In-memory storage for user sessions (use Redis/Database in production)
    this.userSessions = new Map();
    this.otpStorage = new Map();
  }

  // Get user session
  getSession(phoneNumber) {
    return this.userSessions.get(phoneNumber);
  }

  // Create new session
  createSession(phoneNumber, whatsappPhoneNumber = "") {
    const newSession = {
      state: USER_STATES.INITIAL,
      data: {
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        business_name: "",
        business_duration: "",
        cac_number: "",
        referral: "",
        loan_amount: "",
        state_id: "",
        industry: "",
        twitter: "",
        instagram: "",
        facebook: "",
        linkedin: "",
        whatsapp_phone_number: whatsappPhoneNumber,
        payment_reference: "",
      },
      step: 0,
      createdAt: new Date(),
    };

    this.userSessions.set(phoneNumber, newSession);
    return newSession;
  }

  // Update session
  updateSession(phoneNumber, updates) {
    const session = this.userSessions.get(phoneNumber);
    if (session) {
      Object.assign(session, updates);
      this.userSessions.set(phoneNumber, session);
    }
    return session;
  }

  // Delete session
  deleteSession(phoneNumber) {
    const session = this.userSessions.get(phoneNumber);
    if (session && session.data.email) {
      this.otpStorage.delete(session.data.email);
    }
    return this.userSessions.delete(phoneNumber);
  }

  // Get or create session
  getOrCreateSession(phoneNumber, whatsappPhoneNumber = "") {
    let session = this.getSession(phoneNumber);
    if (!session) {
      session = this.createSession(phoneNumber, whatsappPhoneNumber);
    } else if (whatsappPhoneNumber && !session.data.whatsapp_phone_number) {
      session.data.whatsapp_phone_number = whatsappPhoneNumber;
      this.updateSession(phoneNumber, session);
    }
    return session;
  }

  // Store OTP
  storeOTP(email, otp) {
    this.otpStorage.set(email, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  // Verify OTP
  verifyOTP(email, otp) {
    const stored = this.otpStorage.get(email);
    if (!stored) return false;

    // Check if OTP is expired (10 minutes)
    const isExpired = Date.now() - stored.timestamp > 10 * 60 * 1000;
    if (isExpired) {
      this.otpStorage.delete(email);
      return false;
    }

    // Increment attempts
    stored.attempts++;

    // Check if too many attempts (max 5)
    if (stored.attempts > 5) {
      this.otpStorage.delete(email);
      return false;
    }

    // Verify OTP
    if (stored.otp === otp) {
      this.otpStorage.delete(email);
      return true;
    }

    return false;
  }

  // Clear all sessions (admin function)
  clearAllSessions() {
    this.userSessions.clear();
    this.otpStorage.clear();
  }

  // Get all sessions (admin function)
  getAllSessions() {
    return Array.from(this.userSessions.entries()).map(([phone, session]) => ({
      phone,
      state: session.state,
      data: session.data,
      createdAt: session.createdAt,
    }));
  }

  // Get session statistics
  getStats() {
    const sessions = Array.from(this.userSessions.values());
    const stats = {
      total: sessions.length,
      byState: {},
      completed: 0,
    };

    sessions.forEach((session) => {
      stats.byState[session.state] = (stats.byState[session.state] || 0) + 1;
      if (session.state === USER_STATES.COMPLETED) {
        stats.completed++;
      }
    });

    return stats;
  }
}

module.exports = SessionManager;
