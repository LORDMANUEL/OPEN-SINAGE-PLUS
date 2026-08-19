const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { withFileLock } = require('./file-lock');

class QueueStore {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data' } = {}) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'queues.json');
  }

  async issue({ queue, prefix = 'A', customerName = '', service = '', priority = 0, metadata = {} }) {
    const queueId = validateQueue(queue);
    const ticketPrefix = validatePrefix(prefix);
    const normalizedPriority = Math.max(0, Math.min(9, Math.round(Number(priority) || 0)));
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const nextSequence = items.reduce((max, item) => Math.max(max, Number(item.sequence || 0)), 0) + 1;
      const now = new Date().toISOString();
      const ticket = {
        id: crypto.randomUUID(), queue: queueId, prefix: ticketPrefix, sequence: nextSequence,
        number: `${ticketPrefix}${String(nextSequence).padStart(3, '0')}`,
        customerName: cleanText(customerName, 120), service: cleanText(service, 120), priority: normalizedPriority,
        metadata: sanitizeMetadata(metadata), status: 'waiting', desk: '', createdAt: now, updatedAt: now,
        calledAt: null, completedAt: null, waitMs: null, serviceMs: null,
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

  async callNext(queue, { desk = '', service = '' } = {}) {
    const queueId = validateQueue(queue);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const waiting = items
        .filter(item => item.status === 'waiting' && (!service || item.service === service))
        .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const ticket = waiting[0];
      if (!ticket) return null;
      const now = new Date();
      ticket.status = 'called';
      ticket.desk = cleanText(desk, 80);
      ticket.calledAt = now.toISOString();
      ticket.updatedAt = ticket.calledAt;
      ticket.waitMs = Math.max(0, now.getTime() - Date.parse(ticket.createdAt));
      state[queueId] = items;
      await this.#save(state);
      return ticket;
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
      const now = new Date();
      ticket.status = 'completed';
      ticket.completedAt = now.toISOString();
      ticket.updatedAt = ticket.completedAt;
      ticket.serviceMs = ticket.calledAt ? Math.max(0, now.getTime() - Date.parse(ticket.calledAt)) : 0;
      state[queueId] = items;
      await this.#save(state);
      return ticket;
    });
  }

  async transfer(queue, ticketId, { desk = '', service = '', priority } = {}) {
    const queueId = validateQueue(queue);
    return withFileLock(this.filePath, async () => {
      const state = await this.#load();
      const items = Array.isArray(state[queueId]) ? state[queueId] : [];
      const ticket = items.find(item => item.id === String(ticketId));
      if (!ticket) return null;
      if (service !== undefined) ticket.service = cleanText(service, 120);
      if (desk !== undefined) ticket.desk = cleanText(desk, 80);
      if (priority !== undefined) ticket.priority = Math.max(0, Math.min(9, Math.round(Number(priority) || 0)));
      ticket.status = 'waiting';
      ticket.calledAt = null;
      ticket.updatedAt = new Date().toISOString();
      await this.#save(state);
      return ticket;
    });
  }

  async stats(queue) {
    const items = await this.list(queue);
    const completed = items.filter(item => item.status === 'completed');
    const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    return {
      total: items.length,
      waiting: items.filter(item => item.status === 'waiting').length,
      called: items.filter(item => item.status === 'called').length,
      completed: completed.length,
      averageWaitMs: average(completed.map(item => Number(item.waitMs || 0))),
      averageServiceMs: average(completed.map(item => Number(item.serviceMs || 0))),
    };
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
function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value).slice(0, 20).map(([key, item]) => [cleanText(key, 80), typeof item === 'string' ? cleanText(item, 500) : typeof item === 'number' || typeof item === 'boolean' ? item : null]);
  return Object.fromEntries(entries.filter(([key]) => key));
}

module.exports = { QueueStore, validateQueue, validatePrefix, withFileLock };
