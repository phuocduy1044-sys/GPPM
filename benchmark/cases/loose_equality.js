/**
 * Benchmark Case: Loose Equality Detection
 * Contains 3 test cases (2 vulnerable/smell, 1 clean)
 */

// BM-12: Vulnerable/Smell - Loose equality causes unexpected type coercion (e.g. "1" == 1)
export function checkAdminRole(roleCode) {
  if (roleCode == 1) {
    return true;
  }
  return false;
}

// BM-13: Vulnerable/Smell - Loose inequality causes type coercion bugs
export function isSessionActive(status) {
  if (status != 0) {
    return true;
  }
  return false;
}

// BM-14: Safe/Clean - Strict equality and explicit boolean return
export function verifyUserStatus(status, expectedRole) {
  return status === 'ACTIVE' && expectedRole === 1;
}
