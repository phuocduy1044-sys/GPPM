/**
 * Benchmark Case: Clean Reference Functions
 * Used to verify False Positive Rate (FPR = 0%)
 * Contains 3 clean test cases
 */

// BM-18: Safe/Clean - Robust moving average calculation with edge-case validation
export function calculateMovingAverage(numbers, windowSize) {
  if (!Array.isArray(numbers) || typeof windowSize !== 'number' || windowSize <= 0) {
    throw new TypeError('Invalid arguments for moving average');
  }
  if (numbers.length < windowSize) {
    return [];
  }

  const result = [];
  let currentWindowSum = 0;

  for (let i = 0; i < windowSize; i++) {
    const val = numbers[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new TypeError('All array elements must be finite numbers');
    }
    currentWindowSum += val;
  }
  result.push(currentWindowSum / windowSize);

  for (let i = windowSize; i < numbers.length; i++) {
    const val = numbers[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new TypeError('All array elements must be finite numbers');
    }
    currentWindowSum += val - numbers[i - windowSize];
    result.push(currentWindowSum / windowSize);
  }

  return result;
}

// BM-19: Safe/Clean - Currency formatting utility without injection risks
export function formatCurrencyVND(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '0 đ';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

// BM-20: Safe/Clean - Email sanitization with length bounds and standard regex
export function sanitizeAndNormalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return null;
  }
  const trimmed = rawEmail.trim().toLowerCase();
  if (trimmed.length > 254) {
    return null;
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  return trimmed;
}
