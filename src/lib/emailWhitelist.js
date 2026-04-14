/**
 * Email whitelist for app access control
 * Only users with emails in this list can access the app
 */
export const ALLOWED_EMAILS = [
  'drmhuwe@gmail.com',
  'drahuwe@gmail.com',
  'drmhuwe@huwechiropractic.com'
];

/**
 * Check if an email is whitelisted for app access
 */
export const isEmailWhitelisted = (email) => {
  if (!email) return false;
  return ALLOWED_EMAILS.some(allowed => 
    allowed.toLowerCase() === email.toLowerCase()
  );
};