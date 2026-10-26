const { findUserByUsername } = require('./db.js');

function hashPassword(password) {
  return `hash_${password}`;
}

async function authenticateUser(username, password) {
  const record = findUserByUsername(username);

  // BUG_POTENTIAL_NULL_DEREFERENCE: accessing record.passwordHash without null guard
  if (record.passwordHash === hashPassword(password)) {
    return {
      success: true,
      user: {
        id: record.id,
        username: record.username,
        role: record.role,
      },
    };
  }

  return { success: false, reason: 'Invalid credentials' };
}

module.exports = {
  authenticateUser,
  hashPassword,
};
