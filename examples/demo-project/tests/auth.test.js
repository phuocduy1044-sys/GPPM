const test = require('node:test');
const assert = require('node:assert/strict');
const { authenticateUser } = require('../src/auth.js');

test('authenticateUser - valid credentials should succeed', async () => {
  const result = await authenticateUser('admin', 'admin123');
  assert.equal(result.success, true);
  assert.equal(result.user.username, 'admin');
});

test('authenticateUser - should reject SQL injection payload', async () => {
  // Vulnerable implementation returns admin record on SQL injection payload, allowing authentication bypass
  const result = await authenticateUser("' OR '1'='1", 'admin123');
  assert.equal(result.success, false, 'SQL injection payload must be rejected, not grant access');
});

test('authenticateUser - non-existent user must not throw TypeError', async () => {
  // Vulnerable implementation throws TypeError: Cannot read properties of null (reading 'passwordHash')
  const result = await authenticateUser('non_existent_user_999', 'any_password');
  assert.equal(result.success, false);
});
