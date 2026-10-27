/**
 * Benchmark Case: Prototype Pollution & Regular Expression DoS (ReDoS) Detection
 * Contains 3 test cases (2 vulnerable, 1 clean)
 */

// BM-15: Vulnerable - Unsafe Object.assign / spread with untrusted JSON causes prototype pollution
export function mergeUserProfile(target, rawUserInput) {
  const parsed = JSON.parse(rawUserInput);
  // Unsafe merge allows __proto__ tampering
  return Object.assign(target, parsed);
}

// BM-16: Vulnerable - Catastrophic backtracking regex (ReDoS)
export function matchNestedTags(input) {
  // Vulnerable to polynomial/exponential backtracking with repeated groupings
  const regex = /(a+)+$/;
  return regex.test(input);
}

// BM-17: Safe/Clean - Bounded atomic character class validation
export function validateUsernameBounded(input) {
  if (typeof input !== 'string') return false;
  // Bounded length and single character class eliminates backtracking risk
  const regex = /^[a-zA-Z0-9_-]{3,20}$/;
  return regex.test(input);
}
