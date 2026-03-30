/**
 * Field Transformation Functions
 *
 * Reusable transformations for mapping approved facts to tax input fields.
 * Each transform is pure and deterministic.
 */

export type TransformResult<T = any> = {
  value: T;
  warnings: string[];
};

/**
 * Identity transform - pass through unchanged
 */
export function identity(value: any): TransformResult {
  return { value, warnings: [] };
}

/**
 * Currency string to number
 * Handles: "$1,234.56" → 1234.56
 */
export function currencyToNumber(value: any): TransformResult<number | null> {
  if (value === null || value === undefined || value === '') {
    return { value: null, warnings: [] };
  }

  if (typeof value === 'number') {
    return { value, warnings: [] };
  }

  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return {
        value: null,
        warnings: [`Failed to parse currency value: "${value}"`],
      };
    }

    return { value: parsed, warnings: [] };
  }

  return {
    value: null,
    warnings: [`Unexpected currency value type: ${typeof value}`],
  };
}

/**
 * Coalesce to zero if null/undefined
 */
export function coalesceZero(value: any): TransformResult<number> {
  const result = currencyToNumber(value);
  return {
    value: result.value ?? 0,
    warnings: result.warnings,
  };
}

/**
 * Ensure value is positive, otherwise return 0
 */
export function safePositiveCurrency(value: any): TransformResult<number> {
  const result = currencyToNumber(value);

  if (result.value === null) {
    return { value: 0, warnings: result.warnings };
  }

  if (result.value < 0) {
    return {
      value: 0,
      warnings: [...result.warnings, `Negative value converted to 0: ${result.value}`],
    };
  }

  return result;
}

/**
 * Sum multiple field values
 */
export function sumFields(...values: any[]): TransformResult<number> {
  let sum = 0;
  const warnings: string[] = [];

  for (const value of values) {
    const result = currencyToNumber(value);
    warnings.push(...result.warnings);

    if (result.value !== null) {
      sum += result.value;
    }
  }

  return { value: sum, warnings };
}

/**
 * Subtract fields: first - second
 */
export function subtractFields(first: any, second: any): TransformResult<number> {
  const firstResult = currencyToNumber(first);
  const secondResult = currencyToNumber(second);

  const warnings = [...firstResult.warnings, ...secondResult.warnings];

  const firstValue = firstResult.value ?? 0;
  const secondValue = secondResult.value ?? 0;

  return {
    value: firstValue - secondValue,
    warnings,
  };
}

/**
 * Boolean presence check - true if value exists and is truthy
 */
export function boolPresence(value: any): TransformResult<boolean> {
  if (typeof value === 'boolean') {
    return { value, warnings: [] };
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') {
      return { value: true, warnings: [] };
    }
    if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === '') {
      return { value: false, warnings: [] };
    }

    return {
      value: false,
      warnings: [`Ambiguous boolean value: "${value}", defaulting to false`],
    };
  }

  return {
    value: !!value,
    warnings: [],
  };
}

/**
 * Nullable number - null if not present or invalid
 */
export function nullableNumber(value: any): TransformResult<number | null> {
  return currencyToNumber(value);
}

/**
 * Last non-null value from array
 */
export function lastNonNull(...values: any[]): TransformResult<any> {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) {
      return { value: values[i], warnings: [] };
    }
  }

  return {
    value: null,
    warnings: ['All values were null'],
  };
}

/**
 * Integer conversion
 */
export function toInteger(value: any): TransformResult<number | null> {
  if (value === null || value === undefined || value === '') {
    return { value: null, warnings: [] };
  }

  if (typeof value === 'number') {
    return { value: Math.floor(value), warnings: [] };
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[,\s]/g, ''), 10);

    if (isNaN(parsed)) {
      return {
        value: null,
        warnings: [`Failed to parse integer value: "${value}"`],
      };
    }

    return { value: parsed, warnings: [] };
  }

  return {
    value: null,
    warnings: [`Unexpected integer value type: ${typeof value}`],
  };
}

/**
 * Percentage to decimal (e.g., "15%" → 0.15)
 */
export function percentageToDecimal(value: any): TransformResult<number | null> {
  if (value === null || value === undefined || value === '') {
    return { value: null, warnings: [] };
  }

  if (typeof value === 'number') {
    // Assume if > 1, it's already in percentage form (e.g., 15 → 0.15)
    return { value: value > 1 ? value / 100 : value, warnings: [] };
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[%\s]/g, '');
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      return {
        value: null,
        warnings: [`Failed to parse percentage value: "${value}"`],
      };
    }

    return { value: parsed / 100, warnings: [] };
  }

  return {
    value: null,
    warnings: [`Unexpected percentage value type: ${typeof value}`],
  };
}

/**
 * Date string to ISO date
 */
export function toISODate(value: any): TransformResult<string | null> {
  if (value === null || value === undefined || value === '') {
    return { value: null, warnings: [] };
  }

  if (value instanceof Date) {
    return { value: value.toISOString(), warnings: [] };
  }

  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          value: null,
          warnings: [`Invalid date string: "${value}"`],
        };
      }
      return { value: date.toISOString(), warnings: [] };
    } catch (error) {
      return {
        value: null,
        warnings: [`Failed to parse date: "${value}"`],
      };
    }
  }

  return {
    value: null,
    warnings: [`Unexpected date value type: ${typeof value}`],
  };
}

/**
 * Enforce maximum value
 */
export function maxValue(value: any, max: number): TransformResult<number | null> {
  const result = currencyToNumber(value);

  if (result.value === null) {
    return result;
  }

  if (result.value > max) {
    return {
      value: max,
      warnings: [...result.warnings, `Value ${result.value} capped at maximum ${max}`],
    };
  }

  return result;
}

/**
 * Enforce minimum value
 */
export function minValue(value: any, min: number): TransformResult<number | null> {
  const result = currencyToNumber(value);

  if (result.value === null) {
    return result;
  }

  if (result.value < min) {
    return {
      value: min,
      warnings: [...result.warnings, `Value ${result.value} raised to minimum ${min}`],
    };
  }

  return result;
}
