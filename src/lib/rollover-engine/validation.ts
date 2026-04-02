// =============================================================================
// Rollover Engine — Input Validation & Sanitization
// =============================================================================

/** Validates EIN format: XX-XXXXXXX */
export function validateEIN(ein: string): { valid: boolean; error?: string } {
  if (!ein) return { valid: false, error: 'EIN is required' };
  if (!/^\d{2}-\d{7}$/.test(ein)) {
    return { valid: false, error: 'EIN must be in XX-XXXXXXX format' };
  }
  return { valid: true };
}

/** Sanitizes text input to prevent XSS */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/** Validates US state code */
export function validateStateCode(state: string): boolean {
  const validStates = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
  ];
  return validStates.includes(state.toUpperCase());
}

/** Validates dollar amount is reasonable */
export function validateBalance(cents: number): { valid: boolean; error?: string } {
  if (cents < 0) return { valid: false, error: 'Balance cannot be negative' };
  if (cents > 100000000000) return { valid: false, error: 'Balance exceeds maximum ($1B)' };
  return { valid: true };
}

/** Validates age is reasonable */
export function validateAge(age: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(age)) return { valid: false, error: 'Age must be a whole number' };
  if (age < 18) return { valid: false, error: 'Participant must be at least 18' };
  if (age > 120) return { valid: false, error: 'Age exceeds maximum' };
  return { valid: true };
}
