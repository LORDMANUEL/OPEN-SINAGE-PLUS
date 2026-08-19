const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { withFileLock } = require('./file-lock');

class DeviceStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'devices.json');
  }

  async register({ userAgent = '' } = {}) {
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const deviceToken = crypto.randomBytes(24).toString('base64url');
      let pairingCode;
      do { pairingCode = randomPairingCode(); } while (Object.values(state).some(device => device.pairingCode === pairingCode));
      const now = new Date().toISOString();
      const device = {
        deviceToken, pairingCode, sceneToken: null, name: '', userAgent: cleanText(userAgent, 240),
        createdAt: now, updatedAt: now, lastSeenAt: now, appVersion: '', resolution: '', orientation: '',
        storageFreeBytes: null, storageQuotaBytes: null, currentSceneToken: null, lastError: '',
      };
      state[deviceToken] = device;
      await this.#save(state);
      return device;
    });
  }

  async list({ onlineWithinMs = 90_000 } = {}) {
    const state = await this.#load();
    const now = Date.now();
    return Object.values(state)
      .filter(device => device && typeof device === 'object')
      .map(device => ({ ...device, online: isOnline(device.lastSeenAt, now, onlineWithinMs) }))
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  async get(deviceToken) {
    const token = validateDeviceToken(deviceToken);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const device = state[token];
      if (!device) return null;
      device.lastSeenAt = new Date().toISOString();
      state[token] = device;
      await this.#save(state);
      return device;
    });
  }

  async heartbeat(deviceToken, metadata = {}) {
    const token = validateDeviceToken(deviceToken);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const device = state[token];
      if (!device) return null;
      const now = new Date().toISOString();
      device.lastSeenAt = now;
      device.updatedAt = now;
      device.appVersion = cleanText(metadata.appVersion ?? device.appVersion, 80);
      device.resolution = cleanText(metadata.resolution ?? device.resolution, 40);
      device.orientation = ['landscape', 'portrait', 'unknown'].includes(metadata.orientation) ? metadata.orientation : (device.orientation || 'unknown');
      device.storageFreeBytes = finiteOrNull(metadata.storageFreeBytes, device.storageFreeBytes);
      device.storageQuotaBytes = finiteOrNull(metadata.storageQuotaBytes, device.storageQuotaBytes);
      device.currentSceneToken = metadata.currentSceneToken ? validateSceneToken(metadata.currentSceneToken) : (device.currentSceneToken || device.sceneToken || null);
      device.lastError = cleanText(metadata.lastError ?? '', 500);
      state[token] = device;
      await this.#save(state);
      return { ...device, online: true };
    });
  }

  async fleetHealth({ onlineWithinMs = 90_000 } = {}) {
    const devices = await this.list({ onlineWithinMs });
    const online = devices.filter(device => device.online).length;
    const errors = devices.filter(device => device.lastError).length;
    return { total: devices.length, online, offline: devices.length - online, errors, devices };
  }

  async pair({ pairingCode, sceneToken, name = '' }) {
    const code = validatePairingCode(pairingCode);
    const scene = validateSceneToken(sceneToken);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const entry = Object.entries(state).find(([, device]) => device.pairingCode === code);
      if (!entry) return null;
      const [token, device] = entry;
      device.sceneToken = scene;
      device.currentSceneToken = scene;
      device.name = cleanText(name, 120);
      device.updatedAt = new Date().toISOString();
      state[token] = device;
      await this.#save(state);
      return device;
    });
  }

  async unpair(deviceToken) {
    const token = validateDeviceToken(deviceToken);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const device = state[token];
      if (!device) return null;
      device.sceneToken = null;
      device.currentSceneToken = null;
      device.updatedAt = new Date().toISOString();
      state[token] = device;
      await this.#save(state);
      return device;
    });
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
    const temp = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temp, this.filePath);
  }
}

function randomPairingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let output = '';
  for (let index = 0; index < 6; index += 1) output += alphabet[bytes[index] % alphabet.length];
  return output;
}
function validateDeviceToken(value) {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) throw new Error('invalid device token');
  return token;
}
function validatePairingCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('invalid pairing code');
  return code;
}
function validateSceneToken(value) {
  const token = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(token)) throw new Error('invalid scene token');
  return token;
}
function cleanText(value, limit) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); }
function finiteOrNull(value, fallback = null) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback ?? null; }
function isOnline(lastSeenAt, now = Date.now(), withinMs = 90_000) { const at = Date.parse(lastSeenAt || ''); return Number.isFinite(at) && now - at <= withinMs; }

module.exports = { DeviceStore, randomPairingCode, validateDeviceToken, validatePairingCode, validateSceneToken, isOnline };
