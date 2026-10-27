/**
 * Benchmark Case: SQL Injection Detection
 * Contains 4 test cases (2 vulnerable, 2 clean)
 */

// BM-01: Vulnerable - String concatenation in SQL query
export function getUserUnsafe(req, db) {
  const query = "SELECT * FROM users WHERE username = '" + req.query.user + "'";
  return db.query(query);
}

// BM-02: Vulnerable - Template literal concatenation in SQL query
export function searchOrdersUnsafe(keyword, db) {
  const sql = `SELECT * FROM orders WHERE description LIKE '%${keyword}%'`;
  return db.query(sql);
}

// BM-03: Safe/Clean - Parameterized query prevents SQL injection
export function getUserSafe(userId, db) {
  const query = 'SELECT * FROM users WHERE id = $1';
  return db.query(query, [userId]);
}

// BM-04: Safe/Clean - Type-safe ORM query with parameter mapping
export function findUserByEmailOrm(email, userRepo) {
  if (!email || typeof email !== 'string') {
    throw new TypeError('Valid email required');
  }
  return userRepo.findOne({
    where: { email: email.trim().toLowerCase() }
  });
}
