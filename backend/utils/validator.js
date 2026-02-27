/**
 * Input Validation Utilities
 * Strict validation for common fields
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} { valid: boolean, error: string }
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) return { valid: false, error: 'Email is required' };
  if (email.length > 255) return { valid: false, error: 'Email exceeds maximum length (255 chars)' };
  if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
  
  return { valid: true };
}

/**
 * Validate phone number (E.164 format or common formats)
 * @param {string} phone - Phone to validate
 * @returns {object} { valid: boolean, error: string }
 */
function validatePhone(phone) {
  if (!phone) return { valid: true }; // Phone is optional
  
  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it's 7-15 digits (E.164 allows 5-15 after country code)
  if (!/^[+]?[0-9]{7,15}$/.test(cleaned)) {
    return { valid: false, error: 'Invalid phone format. Use 7-15 digits or E.164 format (+1234567890)' };
  }
  
  return { valid: true };
}

/**
 * Validate date string (YYYY-MM-DD or ISO format)
 * @param {string} dateStr - Date string to validate
 * @returns {object} { valid: boolean, error: string, date: Date }
 */
function validateDate(dateStr) {
  if (!dateStr) return { valid: false, error: 'Date is required' };
  
  const date = new Date(dateStr);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  
  return { valid: true, date };
}

/**
 * Validate date range (startDate < endDate)
 * @param {string} startStr - Start date
 * @param {string} endStr - End date
 * @returns {object} { valid: boolean, error: string }
 */
function validateDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime())) return { valid: false, error: 'Invalid start date' };
  if (isNaN(end.getTime())) return { valid: false, error: 'Invalid end date' };
  if (start >= end) return { valid: false, error: 'End date must be after start date' };
  
  return { valid: true };
}

/**
 * Validate name (no special characters, 2-100 chars)
 * @param {string} name - Name to validate
 * @returns {object} { valid: boolean, error: string }
 */
function validateName(name) {
  if (!name) return { valid: false, error: 'Name is required' };
  if (name.length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  if (name.length > 100) return { valid: false, error: 'Name exceeds 100 characters' };
  
  // Allow letters, numbers, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z0-9\s\-\'\.ぁ-ん ァ-ヴー一-龯々〆々]*$/.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate text field (general purpose)
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 255)
 * @returns {object} { valid: boolean, error: string }
 */
function validateText(text, minLength = 1, maxLength = 255) {
  if (!text && minLength > 0) return { valid: false, error: `Text is required` };
  if (text && text.length < minLength) return { valid: false, error: `Minimum ${minLength} characters required` };
  if (text && text.length > maxLength) return { valid: false, error: `Maximum ${maxLength} characters allowed` };
  
  return { valid: true };
}

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {object} { valid: boolean, error: string }
 */
function validateInteger(value, min = null, max = null) {
  const num = parseInt(value);
  
  if (isNaN(num)) return { valid: false, error: 'Must be a valid number' };
  if (min !== null && num < min) return { valid: false, error: `Minimum value is ${min}` };
  if (max !== null && num > max) return { valid: false, error: `Maximum value is ${max}` };
  
  return { valid: true, value: num };
}

/**
 * Validate category (participant, speaker, chairperson, vip)
 * @param {string} category - Category to validate
 * @returns {object} { valid: boolean, error: string }
 */
function validateCategory(category) {
  const validCategories = ['participant', 'speaker', 'chairperson', 'vip', 'staff'];
  
  if (!category) return { valid: false, error: 'Category is required' };
  if (!validCategories.includes(category.toLowerCase())) {
    return { valid: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {object} { valid: boolean, error: string }
 */
function validateUrl(url) {
  if (!url) return { valid: true }; // URL is optional
  
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export {
  validateEmail,
  validatePhone,
  validateDate,
  validateDateRange,
  validateName,
  validateText,
  validateInteger,
  validateCategory,
  validateUrl
};
