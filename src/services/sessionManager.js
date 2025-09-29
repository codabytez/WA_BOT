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
  createSession(phoneNumber, whatsappNumber = "") {
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
        business_address: "",
        industry: "",
        twitter: "",
        instagram: "",
        facebook: "",
        linkedin: "",
        whatsapp_number: whatsappNumber,
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
  getOrCreateSession(phoneNumber, whatsappNumber = "") {
    let session = this.getSession(phoneNumber);
    if (!session) {
      session = this.createSession(phoneNumber, whatsappNumber);
    } else if (whatsappNumber && !session.data.whatsapp_number) {
      session.data.whatsapp_number = whatsappNumber;
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
