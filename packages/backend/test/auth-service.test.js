const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthService } = require('../src/auth-service');

test('auth service validates bootstrap credentials and signs a verifiable session', async () => {
  const auth = new AuthService({ email: 'admin@example.com', password: 'StrongPass123!', secret: '12345678901234567890123456789012', ttlSeconds: 3600 });
  const session = await auth.login('admin@example.com', 'StrongPass123!');
  assert.equal(session.user.email, 'admin@example.com');
  assert.equal(session.user.role, 'admin');
  assert.match(session.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const verified = auth.verify(session.token);
  assert.equal(verified.email, 'admin@example.com');
  assert.equal(verified.role, 'admin');
});

test('auth service rejects bad credentials and tampered sessions', async () => {
  const auth = new AuthService({ email: 'admin@example.com', password: 'StrongPass123!', secret: '12345678901234567890123456789012' });
  await assert.rejects(() => auth.login('admin@example.com', 'bad'), /credentials/i);
  const session = await auth.login('admin@example.com', 'StrongPass123!');
  assert.throws(() => auth.verify(`${session.token}x`), /session/i);
});

test('auth service refuses weak bootstrap configuration', () => {
  assert.throws(() => new AuthService({ email: 'admin@example.com', password: 'short', secret: 'short' }), /password|secret/i);
});
