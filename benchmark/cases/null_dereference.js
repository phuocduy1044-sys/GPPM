/**
 * Benchmark Case: Null / Undefined Dereference Detection
 * Contains 4 test cases (2 vulnerable, 2 clean)
 */

// BM-05: Vulnerable - Accessing nested properties without null/undefined check
export function getUserPassword(dbRecord) {
  // If dbRecord or dbRecord.auth is null/undefined, this throws TypeError
  return dbRecord.auth.passwordHash;
}

// BM-06: Vulnerable - Accessing element in potentially empty array without bounds check
export function getFirstCustomerCity(customerList) {
  // If customerList is empty or customerList[0].address is null, runtime error
  return customerList[0].address.city;
}

// BM-07: Safe/Clean - Optional chaining with fallback value
export function getUserCitySafe(customer) {
  return customer?.address?.city ?? 'Unknown';
}

// BM-08: Safe/Clean - Guard clauses ensure safe access
export function validateRecordGuard(record) {
  if (!record || !record.metadata || typeof record.metadata.id !== 'string') {
    return null;
  }
  return record.metadata.id.trim();
}
