const { latestBackupStatus, diskStatus, probeTlsCertificate } = require('./operational-health');

class HealthMonitor {
  constructor({ deviceStore, xiboClient, notificationService, intervalMs = 60_000, cooldownMs = 15 * 60_000, dataDir = '', backupRoot = '', tlsDomain = '', diskMinFreePercent = 10, backupMaxAgeHours = 30, tlsWarnDays = 21 }) {
    this.deviceStore = deviceStore;
    this.xiboClient = xiboClient;
    this.notificationService = notificationService;
    this.intervalMs = Math.max(30_000, Number(intervalMs || 60_000));
    this.cooldownMs = Math.max(this.intervalMs, Number(cooldownMs || 900_000));
    this.dataDir = String(dataDir || '');
    this.backupRoot = String(backupRoot || '');
    this.tlsDomain = String(tlsDomain || '');
    this.diskMinFreePercent = Number(diskMinFreePercent || 10);
    this.backupMaxAgeHours = Number(backupMaxAgeHours || 30);
    this.tlsWarnDays = Number(tlsWarnDays || 21);
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

    if (this.dataDir) {
      const disk = diskStatus({ dataDir: this.dataDir, minFreePercent: this.diskMinFreePercent });
      if (!disk.ok) await this.#alert('disk-low', 'Espacio de disco bajo', `Open Signage tiene ${disk.freePercent.toFixed(1)}% libre (${Math.round(disk.freeBytes / 1024 / 1024)} MiB). Umbral: ${disk.minFreePercent}%.`, 'critical');
    }
    if (this.backupRoot) {
      const backup = latestBackupStatus({ backupRoot: this.backupRoot, maxAgeHours: this.backupMaxAgeHours });
      if (!backup.ok) await this.#alert('backup-stale', 'Backup ausente o vencido', backup.reason === 'missing' ? 'No se encontró un backup verificable de Open Signage Plus.' : `El último backup tiene ${backup.ageHours.toFixed(1)} horas; máximo configurado ${backup.maxAgeHours}.`, 'critical');
    }
    if (this.tlsDomain) {
      const tls = await probeTlsCertificate({ domain: this.tlsDomain, warnDays: this.tlsWarnDays });
      if (!tls.ok) await this.#alert('tls-expiry', 'TLS requiere atención', tls.reason === 'expiring' ? `El certificado de ${this.tlsDomain} vence en ${tls.daysRemaining.toFixed(1)} días.` : `No se pudo validar un certificado TLS saludable para ${this.tlsDomain}: ${tls.reason}.`, tls.expired || tls.reason === 'tls-error' ? 'critical' : 'warning');
    }
  }
  async #alert(key, subject, text, severity) {
    const last = this.lastSent.get(key) || 0;
    if (Date.now() - last < this.cooldownMs) return;
    this.lastSent.set(key, Date.now());
    try { await this.notificationService.send({ subject, text, severity }); } catch { /* monitoring must not crash API */ }
  }
}
module.exports = { HealthMonitor };
