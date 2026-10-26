// Simulated database storage
const DB_USERS = [
  { id: 1, username: 'admin', passwordHash: 'hash_admin123', role: 'admin' },
  { id: 2, username: 'alice', passwordHash: 'hash_alice456', role: 'user' },
];

function queryUnsafe(sql) {
  // Vulnerable simulation: if sql contains OR '1'='1', returns admin regardless of input
  if (sql.includes("' OR '1'='1") || sql.includes("' OR 1=1")) {
    return [DB_USERS[0]];
  }
  const match = sql.match(/username\s*=\s*'([^']+)'/);
  if (match) {
    const username = match[1];
    const user = DB_USERS.find(u => u.username === username);
    return user ? [user] : [];
  }
  return [];
}

function querySafe(sql, params = []) {
  // Parameterized query simulation: strict parameter matching
  if (params.length > 0) {
    const username = params[0];
    const user = DB_USERS.find(u => u.username === username);
    return user ? [user] : [];
  }
  return [];
}

function findUserByUsername(username) {
  // SEC_SQL_INJECTION: template literal interpolation into queryUnsafe
  const results = queryUnsafe(`SELECT * FROM users WHERE username = '${username}'`);
  return results.length > 0 ? results[0] : null;
}

module.exports = {
  queryUnsafe,
  querySafe,
  findUserByUsername,
};
