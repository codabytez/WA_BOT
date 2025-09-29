// Industry categories
const INDUSTRIES = [
  { id: "agriculture", title: "Agriculture & Farming" },
  { id: "technology", title: "Technology & IT" },
  { id: "retail", title: "Retail & Trading" },
  { id: "manufacturing", title: "Manufacturing" },
  { id: "food_beverage", title: "Food & Beverage" },
  { id: "fashion", title: "Fashion & Textile" },
  { id: "healthcare", title: "Healthcare & Medical" },
  { id: "finance", title: "Finance & Insurance" },
  { id: "beauty", title: "Beauty & Personal Care" },
  { id: "other", title: "Other" },
];

// Business duration options
const BUSINESS_DURATION_OPTIONS = [
  { id: "less_than_6_months", title: "Less than 6 months" },
  { id: "6_months_1_year", title: "6 months - 1 year" },
  { id: "1_2_years", title: "1 - 2 years" },
  { id: "2_3_years", title: "2 - 3 years" },
  { id: "3_5_years", title: "3 - 5 years" },
  { id: "more_than_5_years", title: "More than 5 years" },
];

// Loan amount ranges
const LOAN_AMOUNT_OPTIONS = [
  { id: "50000_100000", title: "₦50,000 - ₦100,000" },
  { id: "100000_250000", title: "₦100,000 - ₦250,000" },
  { id: "250000_500000", title: "₦250,000 - ₦500,000" },
  { id: "500000_1000000", title: "₦500,000 - ₦1,000,000" },
  { id: "1000000_2500000", title: "₦1,000,000 - ₦2,500,000" },
  { id: "2500000_5000000", title: "₦2,500,000 - ₦5,000,000" },
  { id: "above_5000000", title: "Above ₦5,000,000" },
];

// Create industry selection message
function createIndustrySelectionMessage(to) {
  // Split industries into two sections for better UX
  const businessServices = INDUSTRIES.slice(0, 9);
  const otherIndustries = INDUSTRIES.slice(9);

  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Select Your Industry",
      },
      body: {
        text: "What industry is your business in? This helps us understand your business better.",
      },
      footer: {
        text: "Choose the category that best fits",
      },
      action: {
        button: "Select Industry",
        sections: [
          {
            title: "Business & Services",
            rows: businessServices.map((industry) => ({
              id: industry.id,
              title: industry.title,
            })),
          },
          {
            title: "Other Industries",
            rows: otherIndustries.map((industry) => ({
              id: industry.id,
              title: industry.title,
            })),
          },
        ],
      },
    },
  };
}

// Create business duration selection message
function createBusinessDurationSelectionMessage(to) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Business Duration",
      },
      body: {
        text: "How long has your business been operating? This helps us assess your business maturity.",
      },
      footer: {
        text: "Select your business age",
      },
      action: {
        button: "Select Duration",
        sections: [
          {
            title: "Business Age",
            rows: BUSINESS_DURATION_OPTIONS.map((duration) => ({
              id: duration.id,
              title: duration.title,
            })),
          },
        ],
      },
    },
  };
}

// Create loan amount selection message
function createLoanAmountSelectionMessage(to) {
  // Split into smaller and larger amounts
  const smallerAmounts = LOAN_AMOUNT_OPTIONS.slice(0, 4);
  const largerAmounts = LOAN_AMOUNT_OPTIONS.slice(4);

  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Select Loan Amount",
      },
      body: {
        text: "How much loan amount are you applying for? Choose the range that matches your needs.",
      },
      footer: {
        text: "Select your preferred range",
      },
      action: {
        button: "Select Amount",
        sections: [
          {
            title: "Small to Medium Loans",
            rows: smallerAmounts.map((amount) => ({
              id: amount.id,
              title: amount.title,
            })),
          },
          {
            title: "Large Loans",
            rows: largerAmounts.map((amount) => ({
              id: amount.id,
              title: amount.title,
            })),
          },
        ],
      },
    },
  };
}

// Helper functions to get display values
function getIndustryDisplayName(industryId) {
  const industry = INDUSTRIES.find((i) => i.id === industryId);
  return industry ? industry.title : industryId;
}

function getBusinessDurationDisplayName(durationId) {
  const duration = BUSINESS_DURATION_OPTIONS.find((d) => d.id === durationId);
  return duration ? duration.title : durationId;
}

function getLoanAmountDisplayName(amountId) {
  const amount = LOAN_AMOUNT_OPTIONS.find((a) => a.id === amountId);
  return amount ? amount.title : amountId;
}

// Check if a value is a valid option ID
function isValidIndustryId(id) {
  return INDUSTRIES.some((industry) => industry.id === id);
}

function isValidBusinessDurationId(id) {
  return BUSINESS_DURATION_OPTIONS.some((duration) => duration.id === id);
}

function isValidLoanAmountId(id) {
  return LOAN_AMOUNT_OPTIONS.some((amount) => amount.id === id);
}

module.exports = {
  INDUSTRIES,
  BUSINESS_DURATION_OPTIONS,
  LOAN_AMOUNT_OPTIONS,
  createIndustrySelectionMessage,
  createBusinessDurationSelectionMessage,
  createLoanAmountSelectionMessage,
  getIndustryDisplayName,
  getBusinessDurationDisplayName,
  getLoanAmountDisplayName,
  isValidIndustryId,
  isValidBusinessDurationId,
  isValidLoanAmountId,
};
