const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROLE_PERMISSIONS = Object.freeze({
  admin: ['*'],
  marketing: ['campaign:read', 'campaign:write', 'campaign:review', 'media:read', 'media:write', 'screen:read', 'schedule:read', 'schedule:write', 'ai:use', 'qr:manage'],
  operator: ['campaign:read', 'screen:read', 'queue:read', 'queue:operate', 'device:pair', 'health:read'],
  viewer: ['campaign:read', 'screen:read', 'media:read', 'schedule:read', 'health:read'],
});

class PlatformStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data', fileName = 'open-signage-plus.sqlite' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, fileName);
    this.db = null;
  }

  async initialize({ adminEmail, adminPassword } = {}) {
    fs.mkdirSync(this.dataDir, { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.#migrate();
    if (adminEmail && adminPassword && !this.#getUserRow(String(adminEmail).trim().toLowerCase())) {
      await this.createUser({ email: adminEmail, name: 'Administrador', role: 'admin', password: adminPassword, active: true });
    }
    return this;
  }

  close() { if (this.db) this.db.close(); this.db = null; }

  #migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        actor_email TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        ip TEXT,
        detail_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_email, at DESC);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        target_json TEXT NOT NULL DEFAULT '{}',
        active_version_id TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        published_at TEXT
      );
      CREATE TABLE IF NOT EXISTS campaign_versions (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        scene_json TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(campaign_id, version)
      );
      CREATE TABLE IF NOT EXISTS dynamic_qr (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        destination TEXT NOT NULL,
        scan_count INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS form_responses (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
        response_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, datetime('now'));
    `);
  }

  async createUser({ email, name = '', role = 'viewer', password, active = true }) {
    this.#assertDb();
    const normalizedEmail = normalizeEmail(email);
    validateRole(role);
    if (String(password || '').length < 12) throw new Error('password must be at least 12 characters');
    if (this.#getUserRow(normalizedEmail)) throw new Error('user already exists');
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    this.db.prepare('INSERT INTO users(id,email,name,role,password_hash,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(id, normalizedEmail, clean(name, 120) || normalizedEmail, role, passwordHash, active ? 1 : 0, now, now);
    return this.findUserByEmail(normalizedEmail);
  }

  listUsers() {
    this.#assertDb();
    return this.db.prepare('SELECT id,email,name,role,active,created_at,updated_at,last_login_at FROM users ORDER BY email').all().map(mapUser);
  }

  findUserByEmail(email) {
    const row = this.#getUserRow(normalizeEmail(email));
    return row ? mapUser(row) : null;
  }

  async authenticate(email, password) {
    const row = this.#getUserRow(normalizeEmail(email));
    if (!row || !row.active) return null;
    if (!(await verifyPassword(String(password || ''), row.password_hash))) return null;
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET last_login_at=?, updated_at=? WHERE id=?').run(now, now, row.id);
    return mapUser({ ...row, last_login_at: now, updated_at: now });
  }

  updateUser(id, { name, role, active }) {
    this.#assertDb();
    const current = this.db.prepare('SELECT * FROM users WHERE id=?').get(String(id));
    if (!current) return null;
    const nextRole = role ?? current.role;
    validateRole(nextRole);
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET name=?, role=?, active=?, updated_at=? WHERE id=?')
      .run(clean(name ?? current.name, 120), nextRole, active === undefined ? current.active : (active ? 1 : 0), now, current.id);
    return mapUser(this.db.prepare('SELECT * FROM users WHERE id=?').get(current.id));
  }

  async setUserPassword(id, password) {
    if (String(password || '').length < 12) throw new Error('password must be at least 12 characters');
    const hash = await hashPassword(password);
    const result = this.db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hash, new Date().toISOString(), String(id));
    return Number(result.changes || 0) > 0;
  }

  audit({ actorEmail = '', action, resourceType = '', resourceId = '', detail = {}, ip = '' }) {
    this.#assertDb();
    if (!action) throw new Error('audit action is required');
    this.db.prepare('INSERT INTO audit_log(at,actor_email,action,resource_type,resource_id,ip,detail_json) VALUES(?,?,?,?,?,?,?)')
      .run(new Date().toISOString(), clean(actorEmail, 200), clean(action, 120), clean(resourceType, 120), clean(resourceId, 200), clean(ip, 120), JSON.stringify(detail || {}));
  }

  listAudit({ limit = 100, actorEmail = '' } = {}) {
    this.#assertDb();
    const max = Math.max(1, Math.min(1000, Number(limit) || 100));
    const rows = actorEmail
      ? this.db.prepare('SELECT * FROM audit_log WHERE actor_email=? ORDER BY id DESC LIMIT ?').all(normalizeEmail(actorEmail), max)
      : this.db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(max);
    return rows.map(row => ({ id: row.id, at: row.at, actorEmail: row.actor_email, action: row.action, resourceType: row.resource_type, resourceId: row.resource_id, ip: row.ip, detail: parseJson(row.detail_json, {}) }));
  }

  setSetting(key, value) {
    this.#assertDb();
    const normalized = clean(key, 160);
    if (!normalized) throw new Error('setting key is required');
    this.db.prepare(`INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`)
      .run(normalized, JSON.stringify(value), new Date().toISOString());
    return value;
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare('SELECT value_json FROM settings WHERE key=?').get(String(key));
    return row ? parseJson(row.value_json, fallback) : fallback;
  }

  listSettings(prefix = '') {
    const rows = prefix ? this.db.prepare('SELECT key,value_json,updated_at FROM settings WHERE key LIKE ? ORDER BY key').all(`${prefix}%`) : this.db.prepare('SELECT key,value_json,updated_at FROM settings ORDER BY key').all();
    return rows.map(row => ({ key: row.key, value: parseJson(row.value_json, null), updatedAt: row.updated_at }));
  }

  createCampaign({ name, createdBy, target = {} }) {
    this.#assertDb();
    const campaignName = clean(name, 160);
    if (!campaignName) throw new Error('campaign name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO campaigns(id,name,status,target_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
      .run(id, campaignName, 'draft', JSON.stringify(target || {}), clean(createdBy, 200), now, now);
    return this.getCampaign(id);
  }

  listCampaigns() { return this.db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC').all().map(row => this.#mapCampaign(row)); }

  getCampaign(id) {
    const row = this.db.prepare('SELECT * FROM campaigns WHERE id=?').get(String(id));
    return row ? this.#mapCampaign(row) : null;
  }

  addCampaignVersion(campaignId, { scene, createdBy }) {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) throw new Error('campaign not found');
    const latest = this.db.prepare('SELECT COALESCE(MAX(version),0) AS version FROM campaign_versions WHERE campaign_id=?').get(String(campaignId));
    const version = Number(latest.version) + 1;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const tx = this.db.prepare('INSERT INTO campaign_versions(id,campaign_id,version,scene_json,created_by,created_at) VALUES(?,?,?,?,?,?)');
    tx.run(id, String(campaignId), version, JSON.stringify(scene || {}), clean(createdBy, 200), now);
    this.db.prepare("UPDATE campaigns SET active_version_id=?, status='draft', approved_by=NULL, approved_at=NULL, updated_at=? WHERE id=?").run(id, now, String(campaignId));
    return this.getCampaignVersion(id);
  }

  getCampaignVersion(id) {
    const row = this.db.prepare('SELECT * FROM campaign_versions WHERE id=?').get(String(id));
    return row ? mapVersion(row) : null;
  }

  listCampaignVersions(campaignId) { return this.db.prepare('SELECT * FROM campaign_versions WHERE campaign_id=? ORDER BY version DESC').all(String(campaignId)).map(mapVersion); }

  setCampaignStatus(campaignId, status, actorEmail) {
    const allowed = new Set(['draft', 'review', 'approved', 'published', 'expired']);
    if (!allowed.has(status)) throw new Error('invalid campaign status');
    const campaign = this.getCampaign(campaignId);
    if (!campaign) throw new Error('campaign not found');
    if (['review', 'approved', 'published'].includes(status) && !campaign.activeVersionId) throw new Error('campaign has no version');
    const now = new Date().toISOString();
    const approvedBy = status === 'approved' || status === 'published' ? clean(actorEmail, 200) : null;
    const approvedAt = status === 'approved' || status === 'published' ? now : null;
    const publishedAt = status === 'published' ? now : campaign.publishedAt;
    this.db.prepare('UPDATE campaigns SET status=?, approved_by=?, approved_at=?, published_at=?, updated_at=? WHERE id=?')
      .run(status, approvedBy, approvedAt, publishedAt, now, String(campaignId));
    return this.getCampaign(campaignId);
  }

  rollbackCampaign(campaignId, versionId, actorEmail) {
    const version = this.getCampaignVersion(versionId);
    if (!version || version.campaignId !== String(campaignId)) throw new Error('campaign version not found');
    const now = new Date().toISOString();
    this.db.prepare("UPDATE campaigns SET active_version_id=?, status='draft', approved_by=NULL, approved_at=NULL, updated_at=? WHERE id=?")
      .run(String(versionId), now, String(campaignId));
    this.audit({ actorEmail, action: 'campaign.rollback', resourceType: 'campaign', resourceId: campaignId, detail: { versionId } });
    return this.getCampaign(campaignId);
  }

  createDynamicQr({ slug, destination }) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(normalizedSlug)) throw new Error('invalid QR slug');
    const url = normalizeHttpUrl(destination);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO dynamic_qr(id,slug,destination,created_at,updated_at) VALUES(?,?,?,?,?)').run(id, normalizedSlug, url, now, now);
    return this.getDynamicQrBySlug(normalizedSlug);
  }

  getDynamicQrBySlug(slug) {
    const row = this.db.prepare('SELECT * FROM dynamic_qr WHERE slug=?').get(String(slug).toLowerCase());
    return row ? mapQr(row) : null;
  }

  listDynamicQr() { return this.db.prepare('SELECT * FROM dynamic_qr ORDER BY updated_at DESC').all().map(mapQr); }

  resolveDynamicQr(slug) {
    const row = this.db.prepare('SELECT * FROM dynamic_qr WHERE slug=? AND enabled=1').get(String(slug).toLowerCase());
    if (!row) return null;
    this.db.prepare('UPDATE dynamic_qr SET scan_count=scan_count+1, updated_at=? WHERE id=?').run(new Date().toISOString(), row.id);
    return { ...mapQr(row), scanCount: Number(row.scan_count) + 1 };
  }

  createForm({ name, schema }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO forms(id,name,schema_json,created_at,updated_at) VALUES(?,?,?,?,?)').run(id, clean(name, 160), JSON.stringify(schema || {}), now, now);
    return this.getForm(id);
  }

  getForm(id) {
    const row = this.db.prepare('SELECT * FROM forms WHERE id=?').get(String(id));
    return row ? { id: row.id, name: row.name, schema: parseJson(row.schema_json, {}), createdAt: row.created_at, updatedAt: row.updated_at } : null;
  }

  submitForm(id, response) {
    if (!this.getForm(id)) throw new Error('form not found');
    const responseId = crypto.randomUUID();
    const at = new Date().toISOString();
    this.db.prepare('INSERT INTO form_responses(id,form_id,response_json,created_at) VALUES(?,?,?,?)').run(responseId, String(id), JSON.stringify(response || {}), at);
    return { id: responseId, formId: String(id), response, createdAt: at };
  }

  listFormResponses(id, limit = 500) {
    return this.db.prepare('SELECT * FROM form_responses WHERE form_id=? ORDER BY created_at DESC LIMIT ?').all(String(id), Math.max(1, Math.min(5000, Number(limit) || 500)))
      .map(row => ({ id: row.id, formId: row.form_id, response: parseJson(row.response_json, {}), createdAt: row.created_at }));
  }

  #mapCampaign(row) {
    return { id: row.id, name: row.name, status: row.status, target: parseJson(row.target_json, {}), activeVersionId: row.active_version_id, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, approvedBy: row.approved_by, approvedAt: row.approved_at, publishedAt: row.published_at };
  }

  #getUserRow(email) { this.#assertDb(); return this.db.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').get(email); }
  #assertDb() { if (!this.db) throw new Error('platform store is not initialized'); }
}

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

function validateRole(role) { if (!ROLE_PERMISSIONS[role]) throw new Error('invalid role'); }
function normalizeEmail(value) { const email = String(value || '').trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('valid email is required'); return email; }
function clean(value, limit) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); }
function parseJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function normalizeHttpUrl(value) { try { const url = new URL(String(value || '')); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return url.toString(); } catch { throw new Error('destination must be a valid HTTP(S) URL'); } }
function mapUser(row) { return { id: row.id, email: row.email, name: row.name, role: row.role, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at, lastLoginAt: row.last_login_at || null }; }
function mapVersion(row) { return { id: row.id, campaignId: row.campaign_id, version: Number(row.version), scene: parseJson(row.scene_json, {}), createdBy: row.created_by, createdAt: row.created_at }; }
function mapQr(row) { return { id: row.id, slug: row.slug, destination: row.destination, scanCount: Number(row.scan_count), enabled: Boolean(row.enabled), createdAt: row.created_at, updatedAt: row.updated_at }; }

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}
async function verifyPassword(password, encoded) {
  const [algorithm, saltText, hashText] = String(encoded || '').split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  const salt = Buffer.from(saltText, 'base64url');
  const expected = Buffer.from(hashText, 'base64url');
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function scrypt(password, salt, length) { return new Promise((resolve, reject) => crypto.scrypt(String(password), salt, length, (error, result) => error ? reject(error) : resolve(result))); }

module.exports = { PlatformStore, ROLE_PERMISSIONS, hasPermission, hashPassword, verifyPassword };
