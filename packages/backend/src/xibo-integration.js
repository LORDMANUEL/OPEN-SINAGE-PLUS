const { XiboClient } = require('./xibo-client');

class UnconfiguredXiboClient {
  #error() { return new Error('Xibo integration is not configured'); }
  async authenticate() { throw this.#error(); }
  async getDisplays() { throw this.#error(); }
  async getLayouts() { throw this.#error(); }
  async getLibrary() { throw this.#error(); }
  async getPlaylists() { throw this.#error(); }
  async getDisplayGroups() { throw this.#error(); }
  async getSchedules() { throw this.#error(); }
  async publishLayout() { throw this.#error(); }
  async createSchedule() { throw this.#error(); }
}

function createXiboIntegrationFromEnv(env = process.env, fetchImpl = globalThis.fetch) {
  const baseUrl = env.XIBO_BASE_URL;
  const clientId = env.XIBO_CLIENT_ID;
  const clientSecret = env.XIBO_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) return new UnconfiguredXiboClient();

  return new XiboClient({
    baseUrl,
    clientId,
    clientSecret,
    fetchImpl,
    timeoutMs: Number(env.XIBO_TIMEOUT_MS || 10000),
  });
}

module.exports = { UnconfiguredXiboClient, createXiboIntegrationFromEnv };
