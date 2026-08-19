const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

class AnalyticsStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(path.join(dataDir, 'analytics.sqlite'));
    this.db.exec(`
      PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS playback_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        scene_token TEXT NOT NULL,
        device_token TEXT,
        at TEXT NOT NULL,
        duration_ms INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_playback_scene_at ON playback_events(scene_token, at DESC);
      CREATE INDEX IF NOT EXISTS idx_playback_device_at ON playback_events(device_token, at DESC);
      CREATE TABLE IF NOT EXISTS interaction_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        scene_token TEXT,
        device_token TEXT,
        item_id TEXT,
        at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_interactions_at ON interaction_events(at DESC);
    `);
  }
  close() { this.db.close(); }
  recordPlayback({ eventType = 'loaded', sceneToken, deviceToken = '', durationMs = null, metadata = {} }) {
    validateToken(sceneToken, 'scene');
    if (deviceToken) validateToken(deviceToken, 'device', 20);
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    this.db.prepare('INSERT INTO playback_events(id,event_type,scene_token,device_token,at,duration_ms,metadata_json) VALUES(?,?,?,?,?,?,?)')
      .run(id, clean(eventType, 40), sceneToken, deviceToken || null, at, finite(durationMs), JSON.stringify(safeMetadata(metadata)));
    return { id, eventType, sceneToken, deviceToken: deviceToken || null, at, durationMs: finite(durationMs), metadata: safeMetadata(metadata) };
  }
  recordInteraction({ eventType = 'click', sceneToken = '', deviceToken = '', itemId = '', metadata = {} }) {
    if (sceneToken) validateToken(sceneToken, 'scene');
    if (deviceToken) validateToken(deviceToken, 'device', 20);
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    this.db.prepare('INSERT INTO interaction_events(id,event_type,scene_token,device_token,item_id,at,metadata_json) VALUES(?,?,?,?,?,?,?)')
      .run(id, clean(eventType, 40), sceneToken || null, deviceToken || null, clean(itemId, 100), at, JSON.stringify(safeMetadata(metadata)));
    return { id, eventType, sceneToken, deviceToken: deviceToken || null, itemId: clean(itemId, 100), at };
  }
  summary({ sinceHours = 24 } = {}) {
    const cutoff = new Date(Date.now() - Math.max(1, Number(sinceHours) || 24) * 3600000).toISOString();
    const playback = this.db.prepare('SELECT COUNT(*) total, COUNT(DISTINCT scene_token) scenes, COUNT(DISTINCT device_token) devices, COALESCE(SUM(duration_ms),0) duration FROM playback_events WHERE at>=?').get(cutoff);
    const interactions = this.db.prepare('SELECT COUNT(*) total FROM interaction_events WHERE at>=?').get(cutoff);
    const topScenes = this.db.prepare('SELECT scene_token sceneToken, COUNT(*) plays, COALESCE(SUM(duration_ms),0) durationMs FROM playback_events WHERE at>=? GROUP BY scene_token ORDER BY plays DESC LIMIT 20').all(cutoff);
    return { since: cutoff, playback: { total: Number(playback.total), scenes: Number(playback.scenes), devices: Number(playback.devices), durationMs: Number(playback.duration) }, interactions: Number(interactions.total), topScenes };
  }
}
function validateToken(value, label, min = 12) { if (!new RegExp(`^[A-Za-z0-9_-]{${min},128}$`).test(String(value || ''))) throw new Error(`invalid ${label} token`); }
function clean(value, limit) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); }
function finite(value) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; }
function safeMetadata(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, item]) => [clean(key, 80), typeof item === 'string' ? clean(item, 500) : typeof item === 'number' || typeof item === 'boolean' ? item : null])); }
module.exports = { AnalyticsStore };
