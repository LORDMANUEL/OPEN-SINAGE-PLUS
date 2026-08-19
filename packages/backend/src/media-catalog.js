const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

class MediaCatalog {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'media-catalog.sqlite');
    this.db = new DatabaseSync(this.filePath);
    this.db.exec(`
      PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS media_catalog (
        id TEXT PRIMARY KEY,
        sha256 TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        display_name TEXT,
        content_type TEXT,
        size_bytes INTEGER NOT NULL,
        tags TEXT NOT NULL DEFAULT '',
        xibo_payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_media_name ON media_catalog(file_name);
      CREATE INDEX IF NOT EXISTS idx_media_created ON media_catalog(created_at DESC);
    `);
  }

  close() { this.db.close(); }
  hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
  findByHash(sha256) { const row = this.db.prepare('SELECT * FROM media_catalog WHERE sha256=?').get(String(sha256)); return row ? mapRow(row) : null; }
  record({ bytes, fileName, displayName = '', contentType = '', tags = '', xiboPayload }) {
    const sha256 = this.hash(bytes);
    const existing = this.findByHash(sha256);
    if (existing) {
      this.db.prepare('UPDATE media_catalog SET usage_count=usage_count+1,last_used_at=?,updated_at=? WHERE sha256=?').run(new Date().toISOString(), new Date().toISOString(), sha256);
      return { ...this.findByHash(sha256), deduplicated: true };
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.db.prepare('INSERT INTO media_catalog(id,sha256,file_name,display_name,content_type,size_bytes,tags,xibo_payload_json,created_at,updated_at,last_used_at,usage_count) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, sha256, clean(fileName, 255), clean(displayName, 255), clean(contentType, 120), bytes.byteLength, clean(tags, 1000), JSON.stringify(xiboPayload || {}), now, now, now, 1);
    return { ...this.findByHash(sha256), deduplicated: false };
  }
  touch(id) { this.db.prepare('UPDATE media_catalog SET usage_count=usage_count+1,last_used_at=?,updated_at=? WHERE id=?').run(new Date().toISOString(), new Date().toISOString(), String(id)); return this.get(id); }
  get(id) { const row = this.db.prepare('SELECT * FROM media_catalog WHERE id=?').get(String(id)); return row ? mapRow(row) : null; }
  search({ q = '', tags = '', limit = 100 } = {}) {
    const max = Math.max(1, Math.min(1000, Number(limit) || 100));
    const query = `%${String(q).trim()}%`;
    const tagQuery = `%${String(tags).trim()}%`;
    return this.db.prepare('SELECT * FROM media_catalog WHERE (file_name LIKE ? OR display_name LIKE ?) AND tags LIKE ? ORDER BY created_at DESC LIMIT ?').all(query, query, tagQuery, max).map(mapRow);
  }
  orphanCandidates({ unusedDays = 30 } = {}) {
    const cutoff = new Date(Date.now() - Math.max(1, Number(unusedDays) || 30) * 86400000).toISOString();
    return this.db.prepare('SELECT * FROM media_catalog WHERE usage_count<=1 AND COALESCE(last_used_at,created_at)<? ORDER BY created_at').all(cutoff).map(mapRow);
  }
}

function mapRow(row) {
  let xiboPayload = {};
  try { xiboPayload = JSON.parse(row.xibo_payload_json); } catch { /* invalid historic payload */ }
  return { id: row.id, sha256: row.sha256, fileName: row.file_name, displayName: row.display_name, contentType: row.content_type, sizeBytes: Number(row.size_bytes), tags: row.tags, xiboPayload, createdAt: row.created_at, updatedAt: row.updated_at, lastUsedAt: row.last_used_at, usageCount: Number(row.usage_count) };
}
function clean(value, limit) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); }

module.exports = { MediaCatalog };
