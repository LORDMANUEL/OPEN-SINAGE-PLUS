const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { withFileLock } = require('./file-lock');

class QueueStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'queues.json');
  }

  async issue({ queue, prefix = 'A', customerName = '' }) {
    const queueId = validateQueue(queue);
    const ticketPrefix = validatePrefix(prefix);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const nextSequence = items.reduce((max, item) => Math.max(max, Number(item.sequence || 0)), 0) + 1;
      const now = new Date().toISOString();
      const ticket = {
        id: crypto.randomUUID(), queue: queueId, prefix: ticketPrefix, sequence: nextSequence,
        number: `${ticketPrefix}${String(nextSequence).padStart(3, '0')}`,
        customerName: cleanText(customerName, 120), status: 'waiting', desk: '', createdAt: now, updatedAt: now,
      };
      items.push(ticket);
      state[queueId] = items;
      await this.#save(state);
      return ticket;
    });
  }

  async list(queue) {
    const queueId = validateQueue(queue);
    const state = await this.#load();
    return Array.isArray(state[queueId]) ? state[queueId] : [];
  }

  async callNext(queue, { desk = '' } = {}) {
    const queueId = validateQueue(queue);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const ticket = items.find(item => item.status === 'waiting');
      if (!ticket) return null;
      ticket.status = 'called'; ticket.desk = cleanText(desk, 80); ticket.calledAt = new Date().toISOString(); ticket.updatedAt = ticket.calledAt;
      state[queueId] = items; await this.#save(state); return ticket;
    });
  }

  async complete(queue, ticketId) {
    const queueId = validateQueue(queue);
    const id = String(ticketId || '').trim();
    if (!id) throw new Error('ticket id is required');
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const ticket = items.find(item => item.id === id);
      if (!ticket) return null;
      ticket.status = 'completed'; ticket.completedAt = new Date().toISOString(); ticket.updatedAt = ticket.completedAt;
      state[queueId] = items; await this.#save(state); return ticket;
    });
  }

  async reset(queue) {
    const queueId = validateQueue(queue);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load(); state[queueId] = []; await this.#save(state); return [];
    });
  }

  async #load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8'); const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) { if (error?.code === 'ENOENT') return {}; throw error; }
  }

  async #save(state) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const temp = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temp, this.filePath);
  }
}

function validateQueue(value) {
  const queue = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(queue)) throw new Error('invalid queue name');
  return queue;
}
function validatePrefix(value) {
  const prefix = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{1,3}$/.test(prefix)) throw new Error('invalid ticket prefix');
  return prefix;
}
function cleanText(value, limit) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit); }

module.exports = { QueueStore, validateQueue, validatePrefix, withFileLock };
