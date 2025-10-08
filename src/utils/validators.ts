// Validate email format
function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Nigerian format)
function isValidPhone(phone: string) {
  const phoneRegex = /^(\+234|0)[7-9][0-1]\d{8}$/;
  return phoneRegex.test(phone);
}

// Validate name (minimum 2 characters)
function isValidName(name: string) {
  return name && name.trim().length >= 2;
}

export { isValidEmail, isValidPhone, isValidName };
