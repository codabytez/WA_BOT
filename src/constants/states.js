// User states for conversation flow
const USER_STATES = {
  INITIAL: "initial",
  AWAITING_EMAIL: "awaiting_email",
  AWAITING_OTP: "awaiting_otp",
  AWAITING_FIRST_NAME: "awaiting_first_name",
  AWAITING_LAST_NAME: "awaiting_last_name",
  AWAITING_PHONE: "awaiting_phone",
  AWAITING_BUSINESS_NAME: "awaiting_business_name",
  AWAITING_BUSINESS_DURATION: "awaiting_business_duration",
  AWAITING_CAC_NUMBER: "awaiting_cac_number",
  AWAITING_LOAN_AMOUNT: "awaiting_loan_amount",
  AWAITING_ADDRESS: "awaiting_address",
  AWAITING_INDUSTRY: "awaiting_industry",
  AWAITING_SOCIAL_MEDIA: "awaiting_social_media",
  AWAITING_REFERRAL: "awaiting_referral",
  AWAITING_PAYMENT: "awaiting_payment",
  AWAITING_PITCH_VIDEO: "awaiting_pitch_video",
  COMPLETED: "completed",
};

const STATUS_MAP = {
  [USER_STATES.INITIAL]: "Not started",
  [USER_STATES.AWAITING_EMAIL]: "Waiting for email address",
  [USER_STATES.AWAITING_OTP]: "Waiting for email verification",
  [USER_STATES.AWAITING_FIRST_NAME]:
    "Collecting personal information (first name)",
  [USER_STATES.AWAITING_LAST_NAME]:
    "Collecting personal information (last name)",
  [USER_STATES.AWAITING_PHONE]: "Collecting contact information",
  [USER_STATES.AWAITING_BUSINESS_NAME]: "Collecting business information",
  [USER_STATES.AWAITING_BUSINESS_DURATION]: "Collecting business details",
  [USER_STATES.AWAITING_CAC_NUMBER]: "Collecting registration details",
  [USER_STATES.AWAITING_LOAN_AMOUNT]: "Collecting loan information",
  [USER_STATES.AWAITING_ADDRESS]: "Collecting location information",
  [USER_STATES.AWAITING_INDUSTRY]: "Collecting industry information",
  [USER_STATES.AWAITING_SOCIAL_MEDIA]: "Collecting social media (optional)",
  [USER_STATES.AWAITING_REFERRAL]: "Collecting referral information",
  [USER_STATES.AWAITING_PAYMENT]: "Waiting for payment confirmation",
  [USER_STATES.AWAITING_PITCH_VIDEO]: "Waiting for pitch video upload",
  [USER_STATES.COMPLETED]: "Application completed",
};

module.exports = {
  USER_STATES,
  STATUS_MAP,
};
