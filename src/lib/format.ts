export function formatPhilippineMobile(input?: string | null) {
  if (!input) return '';
  // Keep only digits
  let digits = String(input).replace(/\D/g, '');

  // Remove leading country code if present
  if (digits.startsWith('63')) digits = digits.slice(2);
  // Remove leading 0 if present and length > 10
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);

  // Limit to max 10 digits
  digits = digits.slice(0, 10);

  if (!digits) return '';

  // Group as 3-3-4 (if shorter, group as available)
  const part1 = digits.slice(0, 3);
  const part2 = digits.length > 3 ? digits.slice(3, 6) : '';
  const part3 = digits.length > 6 ? digits.slice(6) : '';

  const groups = [part1, part2, part3].filter(Boolean);
  return `+63 ${groups.join(' ')}`;
}

export function formatControlNumber(
  paperType: 'barangay_clearance' | 'certificate_of_indigency' | 'proof_of_residency',
  sequence: number
) {
  const typeCode = paperType === 'barangay_clearance'
    ? 'BC'
    : paperType === 'certificate_of_indigency'
    ? 'CI'
    : 'PR';
  return `BRGY-${typeCode}-${String(sequence).padStart(4, '0')}`;
}

export function generateControlNumber() {
  const prefix = 'BRGY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${randomPart}`;
}

export default formatPhilippineMobile;
