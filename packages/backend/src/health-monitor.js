class HealthMonitor {
  constructor({ deviceStore, xiboClient, notificationService, intervalMs = 60_000, cooldownMs = 15 * 60_000 }) {
    this.deviceStore = deviceStore;
    this.xiboClient = xiboClient;
    this.notificationService = notificationService;
    this.intervalMs = Math.max(30_000, Number(intervalMs || 60_000));
    this.cooldownMs = Math.max(this.intervalMs, Number(cooldownMs || 900_000));
    this.timer = null;
    this.lastSent = new Map();
  }
  start() { if (!this.notificationService?.status || !Object.values(this.notificationService.status()).some(Boolean) || this.timer) return; void this.run(); this.timer = setInterval(() => void this.run(), this.intervalMs); this.timer.unref?.(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  async run() {
    const fleet = await this.deviceStore.fleetHealth().catch(() => ({ total: 0, online: 0, offline: 0, errors: 0 }));
    if (fleet.offline > 0) await this.#alert('fleet-offline', 'Pantallas offline', `${fleet.offline} de ${fleet.total} pantallas PLUS están offline.`, 'warning');
    if (fleet.errors > 0) await this.#alert('fleet-errors', 'Errores en players', `${fleet.errors} pantallas reportan errores.`, 'warning');
    try { await this.xiboClient.authenticate(); }
    catch (error) { await this.#alert('xibo-down', 'Motor Xibo desconectado', String(error?.message || 'No se pudo autenticar Xibo').slice(0, 500), 'critical'); }
  }
  async #alert(key, subject, text, severity) {
    const last = this.lastSent.get(key) || 0;
    if (Date.now() - last < this.cooldownMs) return;
    this.lastSent.set(key, Date.now());
    try { await this.notificationService.send({ subject, text, severity }); } catch { /* monitoring must not crash API */ }
  }
}
module.exports = { HealthMonitor };
