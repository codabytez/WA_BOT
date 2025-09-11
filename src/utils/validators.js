// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Nigerian format)
function isValidPhone(phone) {
  const phoneRegex = /^(\+234|0)[7-9][0-1]\d{8}$/;
  return phoneRegex.test(phone);
}

// Validate name (minimum 2 characters)
function isValidName(name) {
  return name && name.trim().length >= 2;
}

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidName,
  generateOTP,
};
