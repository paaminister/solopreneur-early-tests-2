/**
 * Finnish HETU (henkilotunnus / social security number) detector.
 *
 * Format: DDMMYYCZZZQ
 * - DDMMYY: date of birth
 * - C: century marker (+ = 1800s, - = 1900s, A = 2000s)
 * - ZZZ: individual number (odd = male, even = female)
 * - Q: check character
 *
 * Used to detect and block accidentally uploaded patient data.
 */

const HETU_REGEX = /\b(\d{2})(0[1-9]|1[0-2])(\d{2})([+\-A])(\d{3})([0-9A-Y])\b/g;

const HETU_CHECK_CHARS = "0123456789ABCDEFHJKLMNPRSTUVWXY";

export interface HetuMatch {
  value: string;
  position: number;
  isValid: boolean;
}

/**
 * Scan text for potential Finnish HETU patterns.
 * Returns all matches with validation status.
 */
export function detectHetu(text: string): HetuMatch[] {
  const matches: HetuMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  HETU_REGEX.lastIndex = 0;

  while ((match = HETU_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const isValid = validateHetu(fullMatch);
    matches.push({
      value: fullMatch,
      position: match.index,
      isValid,
    });
  }

  return matches;
}

/**
 * Validate a single HETU string.
 */
function validateHetu(hetu: string): boolean {
  if (hetu.length !== 11) return false;

  const day = parseInt(hetu.substring(0, 2), 10);
  const month = parseInt(hetu.substring(2, 4), 10);
  const centuryChar = hetu.charAt(6);
  const individualNum = hetu.substring(7, 10);
  const checkChar = hetu.charAt(10);

  // Basic date validation
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (!["+", "-", "A"].includes(centuryChar)) return false;

  // Check character validation
  const numPart = hetu.substring(0, 6) + individualNum;
  const remainder = parseInt(numPart, 10) % 31;
  const expectedCheck = HETU_CHECK_CHARS[remainder];

  return checkChar === expectedCheck;
}

/**
 * Check if text contains any HETU-like patterns.
 * Returns true if potential patient data is detected.
 */
export function containsHetu(text: string): boolean {
  return detectHetu(text).length > 0;
}
