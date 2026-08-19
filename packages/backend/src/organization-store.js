const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

class OrganizationStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(path.join(dataDir, 'organizations.sqlite'));
    this.db.exec(`
      PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL, code TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
        active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(organization_id, code)
      );
      CREATE TABLE IF NOT EXISTS memberships (
        user_email TEXT NOT NULL COLLATE NOCASE,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
        role_scope TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL,
        PRIMARY KEY(user_email, organization_id, location_id)
      );
    `);
  }
  close() { this.db.close(); }
  createOrganization({ name, slug }) {
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    const cleanSlug = normalizeSlug(slug || name);
    this.db.prepare('INSERT INTO organizations(id,name,slug,created_at,updated_at) VALUES(?,?,?,?,?)').run(id, clean(name, 160), cleanSlug, now, now);
    return this.getOrganization(id);
  }
  getOrganization(id) { const row = this.db.prepare('SELECT * FROM organizations WHERE id=?').get(String(id)); return row ? mapOrg(row) : null; }
  listOrganizations() { return this.db.prepare('SELECT * FROM organizations ORDER BY name').all().map(mapOrg); }
  createLocation({ organizationId, name, code, timezone = 'America/Tegucigalpa' }) {
    if (!this.getOrganization(organizationId)) throw new Error('organization not found');
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    this.db.prepare('INSERT INTO locations(id,organization_id,name,code,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id, String(organizationId), clean(name, 160), normalizeCode(code || name), clean(timezone, 80), now, now);
    return this.getLocation(id);
  }
  getLocation(id) { const row = this.db.prepare('SELECT * FROM locations WHERE id=?').get(String(id)); return row ? mapLocation(row) : null; }
  listLocations(organizationId = '') { const rows = organizationId ? this.db.prepare('SELECT * FROM locations WHERE organization_id=? ORDER BY name').all(String(organizationId)) : this.db.prepare('SELECT * FROM locations ORDER BY name').all(); return rows.map(mapLocation); }
  addMembership({ userEmail, organizationId, locationId = null, roleScope = 'member' }) {
    const email = normalizeEmail(userEmail);
    if (!this.getOrganization(organizationId)) throw new Error('organization not found');
    if (locationId) { const location = this.getLocation(locationId); if (!location || location.organizationId !== String(organizationId)) throw new Error('location not found in organization'); }
    this.db.prepare('INSERT OR REPLACE INTO memberships(user_email,organization_id,location_id,role_scope,created_at) VALUES(?,?,?,?,?)').run(email, String(organizationId), locationId ? String(locationId) : null, clean(roleScope, 40), new Date().toISOString());
    return this.listMemberships(email);
  }
  listMemberships(userEmail) {
    const email = normalizeEmail(userEmail);
    return this.db.prepare(`SELECT m.user_email,m.organization_id,m.location_id,m.role_scope,o.name organization_name,l.name location_name
      FROM memberships m JOIN organizations o ON o.id=m.organization_id LEFT JOIN locations l ON l.id=m.location_id WHERE m.user_email=? ORDER BY o.name,l.name`).all(email)
      .map(row => ({ userEmail: row.user_email, organizationId: row.organization_id, organizationName: row.organization_name, locationId: row.location_id, locationName: row.location_name, roleScope: row.role_scope }));
  }
}
function mapOrg(row) { return { id: row.id, name: row.name, slug: row.slug, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapLocation(row) { return { id: row.id, organizationId: row.organization_id, name: row.name, code: row.code, timezone: row.timezone, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at }; }
function clean(value, limit) { const result = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); if (!result) throw new Error('value is required'); return result; }
function normalizeSlug(value) { const slug = String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64); if (slug.length < 2) throw new Error('invalid organization slug'); return slug; }
function normalizeCode(value) { const code = String(value || '').toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 24); if (!code) throw new Error('invalid location code'); return code; }
function normalizeEmail(value) { const email = String(value || '').trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('valid email is required'); return email; }
module.exports = { OrganizationStore };
