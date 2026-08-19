const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class DeviceStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'devices.json');
  }

  async register({ userAgent = '' } = {}) {
    const state = await this.#load();
    const deviceToken = crypto.randomBytes(24).toString('base64url');
    let pairingCode;
    do { pairingCode = randomPairingCode(); } while (Object.values(state).some(device => device.pairingCode === pairingCode));
    const now = new Date().toISOString();
    const device = {
      deviceToken,
      pairingCode,
      sceneToken: null,
      name: '',
      userAgent: cleanText(userAgent, 240),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };
    state[deviceToken] = device;
    await this.#save(state);
    return device;
  }

  async get(deviceToken) {
    const token = validateDeviceToken(deviceToken);
    const state = await this.#load();
    const device = state[token];
    if (!device) return null;
    device.lastSeenAt = new Date().toISOString();
    state[token] = device;
    await this.#save(state);
    return device;
  }

  async pair({ pairingCode, sceneToken, name = '' }) {
    const code = validatePairingCode(pairingCode);
    const scene = validateSceneToken(sceneToken);
    const state = await this.#load();
    const entry = Object.entries(state).find(([, device]) => device.pairingCode === code);
    if (!entry) return null;
    const [token, device] = entry;
    device.sceneToken = scene;
    device.name = cleanText(name, 120);
    device.updatedAt = new Date().toISOString();
    state[token] = device;
    await this.#save(state);
    return device;
  }

  async unpair(deviceToken) {
    const token = validateDeviceToken(deviceToken);
    const state = await this.#load();
    const device = state[token];
    if (!device) return null;
    device.sceneToken = null;
    device.updatedAt = new Date().toISOString();
    state[token] = device;
    await this.#save(state);
    return device;
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

function cleanText(value, limit) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit);
}

module.exports = { DeviceStore, randomPairingCode, validateDeviceToken, validatePairingCode, validateSceneToken };
