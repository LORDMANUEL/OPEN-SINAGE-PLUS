const fs = require('node:fs');
const tls = require('node:tls');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Return the state of the newest Open Signage backup.
 * A backup is considered healthy only when it is recent AND the SHA-256 sidecar
 * matches the archive bytes. This prevents a truncated/corrupt archive from
 * being reported as a successful backup merely because the file exists.
 */
function latestBackupStatus({ backupRoot, now = Date.now(), maxAgeHours = 30 } = {}) {
  const root = String(backupRoot || '').trim();
  if (!root) return { ok: false, reason: 'missing', latest: null, ageHours: null };
  try {
    const files = fs.readdirSync(root)
      .filter(name => /^open-signage-plus-.*\.tar\.gz$/.test(name))
      .map(name => ({ name, file: path.join(root, name), stat: fs.statSync(path.join(root, name)) }))
      .filter(item => item.stat.isFile())
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    if (!files.length) return { ok: false, reason: 'missing', latest: null, ageHours: null };

    const latest = files[0];
    const sidecar = `${latest.file}.sha256`;
    if (!fs.existsSync(sidecar)) return { ok: false, reason: 'checksum-missing', latest: latest.name, ageHours: null };
    const expected = String(fs.readFileSync(sidecar, 'utf8')).trim().split(/\s+/)[0] || '';
    const actual = sha256File(latest.file);
    if (!/^[a-f0-9]{64}$/i.test(expected) || !crypto.timingSafeEqual(Buffer.from(expected.toLowerCase()), Buffer.from(actual))) {
      return { ok: false, reason: 'checksum-mismatch', latest: latest.name, ageHours: null };
    }

    const ageHours = Math.max(0, (Number(now) - latest.stat.mtimeMs) / 3_600_000);
    const limit = Math.max(1, Number(maxAgeHours || 30));
    return { ok: ageHours <= limit, reason: ageHours <= limit ? 'fresh' : 'stale', latest: latest.name, ageHours, maxAgeHours: limit, checksum: 'valid' };
  } catch (error) {
    return { ok: false, reason: 'missing', latest: null, ageHours: null, error: String(error?.message || error).slice(0, 200) };
  }
}

/** Compute storage pressure using statfs-compatible values. */
function diskStatus({ dataDir, minFreePercent = 10, statfs = fs.statfsSync } = {}) {
  const threshold = Math.max(1, Math.min(99, Number(minFreePercent || 10)));
  try {
    const stats = statfs(String(dataDir || '/data'));
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;
    return { ok: freePercent >= threshold, freeBytes, totalBytes, freePercent, minFreePercent: threshold };
  } catch (error) {
    return { ok: false, freeBytes: 0, totalBytes: 0, freePercent: 0, minFreePercent: threshold, error: String(error?.message || error).slice(0, 200) };
  }
}

/** Translate a certificate expiry timestamp into a stable health result. */
function tlsExpiryStatus({ validTo, now = Date.now(), warnDays = 21 } = {}) {
  const expiresAt = Date.parse(String(validTo || ''));
  const threshold = Math.max(1, Number(warnDays || 21));
  if (!Number.isFinite(expiresAt)) return { ok: false, expired: false, reason: 'invalid', daysRemaining: null, validTo: String(validTo || '') };
  const daysRemaining = (expiresAt - Number(now)) / 86_400_000;
  const expired = daysRemaining <= 0;
  return { ok: !expired && daysRemaining > threshold, expired, reason: expired ? 'expired' : daysRemaining <= threshold ? 'expiring' : 'valid', daysRemaining, warnDays: threshold, validTo: new Date(expiresAt).toISOString() };
}

/**
 * Probe the public TLS endpoint with certificate verification enabled.
 * The domain is intentionally restricted to a hostname; paths/ports embedded
 * in user-provided configuration are rejected to avoid turning health checks
 * into an arbitrary network connector.
 */
function probeTlsCertificate({ domain, port = 443, timeoutMs = 5000, warnDays = 21 } = {}) {
  const host = String(domain || '').trim();
  if (!host || host.includes('/') || host.includes(':')) return Promise.resolve({ ok: false, reason: 'not-configured', domain: host });
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (settled) return; settled = true; resolve({ domain: host, ...value }); };
    const socket = tls.connect({ host, port: Number(port || 443), servername: host, rejectUnauthorized: true });
    socket.setTimeout(Math.max(1000, Number(timeoutMs || 5000)));
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      const status = tlsExpiryStatus({ validTo: cert?.valid_to, warnDays });
      socket.end();
      finish(status);
    });
    socket.once('timeout', () => { socket.destroy(); finish({ ok: false, reason: 'timeout' }); });
    socket.once('error', error => { socket.destroy(); finish({ ok: false, reason: 'tls-error', error: String(error?.message || error).slice(0, 200) }); });
  });
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

module.exports = { latestBackupStatus, diskStatus, tlsExpiryStatus, probeTlsCertificate };
