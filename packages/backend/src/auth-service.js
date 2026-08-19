const crypto = require('node:crypto');

class AuthService {
  constructor({ email, password, secret, ttlSeconds = 8 * 3600, platformStore = null } = {}) {
    this.email = String(email || '').trim().toLowerCase();
    this.password = String(password || '');
    this.secret = String(secret || '');
    this.platformStore = platformStore;
    this.ttlSeconds = Math.max(300, Number(ttlSeconds || 28800));
    if (this.secret.length < 32) throw new Error('session secret must be at least 32 characters');
    if (!this.platformStore) {
      if (!/^\S+@\S+\.\S+$/.test(this.email)) throw new Error('valid admin email is required');
      if (this.password.length < 12) throw new Error('admin password must be at least 12 characters');
    }
  }

  async login(email, password) {
    let user;
    if (this.platformStore) {
      user = await this.platformStore.authenticate(email, password);
      if (!user) throw new Error('invalid credentials');
    } else {
      const candidateEmail = String(email || '').trim().toLowerCase();
      const candidatePassword = String(password || '');
      const emailOk = safeEqual(candidateEmail, this.email);
      const passwordOk = safeEqual(candidatePassword, this.password);
      if (!emailOk || !passwordOk) throw new Error('invalid credentials');
      user = { id: 'bootstrap-admin', email: this.email, role: 'admin', name: 'Administrador', active: true };
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: user.id, email: user.email, role: user.role, iat: now, exp: now + this.ttlSeconds };
    return { token: this.#sign(payload), user: { id: user.id, email: user.email, role: user.role, name: user.name }, expiresAt: payload.exp * 1000 };
  }

  verify(token) {
    const value = String(token || '');
    const [encoded, signature] = value.split('.');
    if (!encoded || !signature) throw new Error('invalid session');
    const expected = base64url(crypto.createHmac('sha256', this.secret).update(encoded).digest());
    if (!safeEqual(signature, expected)) throw new Error('invalid session');
    let payload;
    try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { throw new Error('invalid session'); }
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || payload.exp <= now || !payload.email || !payload.role) throw new Error('expired or invalid session');

    if (this.platformStore) {
      const user = this.platformStore.findUserByEmail(payload.email);
      if (!user || !user.active || user.id !== payload.sub || user.role !== payload.role) throw new Error('expired or invalid session');
    } else if (payload.email !== this.email || payload.role !== 'admin') {
      throw new Error('expired or invalid session');
    }
    return payload;
  }

  #sign(payload) {
    const encoded = base64url(Buffer.from(JSON.stringify(payload)));
    const signature = base64url(crypto.createHmac('sha256', this.secret).update(encoded).digest());
    return `${encoded}.${signature}`;
  }
}

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}
function base64url(value) { return Buffer.from(value).toString('base64url'); }
function createAuthServiceFromEnv(env = process.env, platformStore = null) {
  return new AuthService({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, secret: env.SESSION_SECRET, ttlSeconds: Number(env.SESSION_TTL_SECONDS || 28800), platformStore });
}
module.exports = { AuthService, createAuthServiceFromEnv };
