const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ALLOWED_TYPES = new Set(['text', 'image', 'video', 'html']);

class SceneStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'player-scenes.json');
  }

  async create(input) {
    const scene = normalizeScene(input);
    const token = crypto.randomBytes(18).toString('base64url');
    const state = await this.#load();
    state[token] = {
      ...scene,
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.#save(state);
    return { token, scene: state[token] };
  }

  async update(token, input) {
    validateToken(token);
    const scene = normalizeScene(input);
    const state = await this.#load();
    if (!state[token]) return null;
    state[token] = {
      ...state[token],
      ...scene,
      token,
      updatedAt: new Date().toISOString(),
    };
    await this.#save(state);
    return state[token];
  }

  async get(token) {
    validateToken(token);
    const state = await this.#load();
    return state[token] || null;
  }

  async #load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      if (error?.code === 'ENOENT') return {};
      throw error;
    }
  }

  async #save(state) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const temp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(temp, this.filePath);
  }
}

function normalizeScene(input) {
  if (!input || typeof input !== 'object') throw new Error('scene payload is required');
  const name = cleanText(input.name, 120);
  if (!name) throw new Error('scene name is required');

  const duration = Math.max(1, Math.min(86400, Number(input.duration || 15)));
  const background = cleanText(input.background || '#050b18', 100) || '#050b18';
  const items = Array.isArray(input.items) ? input.items.map(normalizeItem) : [];

  return { name, duration, background, items };
}

function normalizeItem(item, index) {
  if (!item || typeof item !== 'object') throw new Error(`scene item ${index} is invalid`);
  if (!ALLOWED_TYPES.has(item.type)) throw new Error(`unsupported scene item type: ${String(item.type)}`);

  const normalized = {
    id: cleanText(item.id, 80) || `item-${index + 1}`,
    type: item.type,
    x: clampPercent(item.x, 0),
    y: clampPercent(item.y, 0),
    width: clampPercent(item.width, 100),
    height: clampPercent(item.height, 100),
    zIndex: Math.max(0, Math.min(1000, Number(item.zIndex || index))),
  };

  if (item.type === 'text') {
    normalized.text = cleanText(item.text, 5000) || '';
    normalized.color = cleanText(item.color || '#ffffff', 40) || '#ffffff';
    normalized.fontSize = Math.max(8, Math.min(320, Number(item.fontSize || 48)));
    normalized.align = ['left', 'center', 'right'].includes(item.align) ? item.align : 'center';
  }

  if (item.type === 'image' || item.type === 'video') {
    normalized.src = safeUrl(item.src);
    if (!normalized.src) throw new Error(`${item.type} item requires an http(s) src`);
    normalized.fit = ['cover', 'contain', 'fill'].includes(item.fit) ? item.fit : 'cover';
    if (item.type === 'video') {
      normalized.muted = item.muted !== false;
      normalized.loop = item.loop !== false;
      normalized.autoplay = item.autoplay !== false;
    }
  }

  if (item.type === 'html') {
    normalized.html = sanitizeHtmlFragment(String(item.html || ''));
  }

  return normalized;
}

function sanitizeHtmlFragment(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 50000);
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function clampPercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

function cleanText(value, limit) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit);
}

function validateToken(token) {
  if (!/^[a-zA-Z0-9_-]{12,128}$/.test(String(token || ''))) throw new Error('invalid player token');
}

module.exports = { SceneStore, normalizeScene, sanitizeHtmlFragment, safeUrl };
