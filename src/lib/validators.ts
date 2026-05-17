export function isValidEmail(email?: string | null) {
  if (!email) return false;
  const s = String(email).trim();
  // Simple RFC-like check: non-empty local@domain.tld, no spaces
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(s);
}

export default isValidEmail;
