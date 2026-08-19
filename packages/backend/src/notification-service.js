const tls = require('node:tls');

class NotificationService {
  constructor({ webhookUrl = '', smtpHost = '', smtpPort = 465, smtpUser = '', smtpPassword = '', smtpFrom = '', alertTo = '', fetchImpl = globalThis.fetch } = {}) {
    this.webhookUrl = safeHttpUrl(webhookUrl);
    this.smtpHost = String(smtpHost || '').trim();
    this.smtpPort = Number(smtpPort || 465);
    this.smtpUser = String(smtpUser || '');
    this.smtpPassword = String(smtpPassword || '');
    this.smtpFrom = String(smtpFrom || smtpUser || '');
    this.alertTo = String(alertTo || '').trim();
    this.fetchImpl = fetchImpl;
  }
  status() { return { webhook: Boolean(this.webhookUrl), email: Boolean(this.smtpHost && this.smtpFrom && this.alertTo) }; }
  async send({ subject, text, severity = 'info', metadata = {} }) {
    const results = [];
    if (this.webhookUrl) results.push(await this.#webhook({ subject, text, severity, metadata }));
    if (this.status().email) results.push(await this.#email({ subject, text }));
    return results;
  }
  async #webhook(payload) {
    const response = await this.fetchImpl(this.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'open-signage-plus', at: new Date().toISOString(), ...payload }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`notification webhook returned ${response.status}`);
    return { channel: 'webhook', ok: true };
  }
  async #email({ subject, text }) {
    await sendSmtps({ host: this.smtpHost, port: this.smtpPort, user: this.smtpUser, password: this.smtpPassword, from: this.smtpFrom, to: this.alertTo, subject, text });
    return { channel: 'email', ok: true };
  }
}

function createNotificationServiceFromEnv(env = process.env, fetchImpl = globalThis.fetch) {
  return new NotificationService({ webhookUrl: env.ALERT_WEBHOOK_URL, smtpHost: env.SMTP_HOST, smtpPort: env.SMTP_PORT, smtpUser: env.SMTP_USER, smtpPassword: env.SMTP_PASSWORD, smtpFrom: env.SMTP_FROM, alertTo: env.ALERT_EMAIL_TO, fetchImpl });
}

function safeHttpUrl(value) {
  if (!value) return '';
  try { const url = new URL(String(value)); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''; }
  catch { return ''; }
}

function sendSmtps({ host, port, user, password, from, to, subject, text }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: true });
    let buffer = '';
    const queue = [];
    let settled = false;
    const fail = error => { if (!settled) { settled = true; socket.destroy(); reject(error); } };
    const command = (line, expected) => new Promise((res, rej) => queue.push({ line, expected, res, rej }));
    function next() {
      const item = queue[0];
      if (!item || !socket.writable) return;
      socket.write(`${item.line}\r\n`);
    }
    socket.on('error', fail);
    socket.on('secureConnect', () => {});
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
      for (const line of lines) {
        if (!/^\d{3}[ -]/.test(line) || line[3] === '-') continue;
        const code = Number(line.slice(0, 3));
        const item = queue.shift();
        if (!item) continue;
        if (!item.expected.includes(code)) item.rej(new Error(`SMTP ${code}: ${line.slice(4)}`)); else item.res(code);
        next();
      }
    });
    (async () => {
      try {
        await command('', [220]); next();
        await command(`EHLO open-signage-plus`, [250]);
        if (user) {
          const auth = Buffer.from(`\u0000${user}\u0000${password}`).toString('base64');
          await command(`AUTH PLAIN ${auth}`, [235]);
        }
        await command(`MAIL FROM:<${from}>`, [250]);
        await command(`RCPT TO:<${to}>`, [250, 251]);
        await command('DATA', [354]);
        const safeSubject = String(subject || 'Open Signage Plus alert').replace(/[\r\n]/g, ' ').slice(0, 200);
        const safeText = String(text || '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..').slice(0, 20000);
        await command(`From: <${from}>\r\nTo: <${to}>\r\nSubject: ${safeSubject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${safeText}\r\n.`, [250]);
        await command('QUIT', [221]);
        if (!settled) { settled = true; socket.end(); resolve({ ok: true }); }
      } catch (error) { fail(error); }
    })();
  });
}

module.exports = { NotificationService, createNotificationServiceFromEnv, safeHttpUrl };
