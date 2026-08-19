const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PlatformStore } = require('../src/platform-store');

function tempDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'osp-form-privacy-')); }

/**
 * Privacy contract for public forms.
 * - Consent is explicit when enabled by the form schema.
 * - Consent metadata is never persisted as business form data.
 * - Retention is enforced by deleting responses older than retentionDays.
 */
test('form consent is enforced and consent metadata is not stored', async (t) => {
  const dataDir = tempDir();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const store = new PlatformStore({ dataDir });
  await store.initialize();
  t.after(() => store.close());

  const form = store.createForm({
    name: 'Contacto',
    schema: {
      fields: [{ name: 'email', type: 'email', required: true }],
      consentRequired: true,
      consentText: 'Acepto el tratamiento de mis datos.',
      retentionDays: 30,
    },
  });

  assert.throws(() => store.submitForm(form.id, { email: 'a@example.com' }), /consent/i);
  const saved = store.submitForm(form.id, { email: 'a@example.com', __consent: true });
  assert.deepEqual(saved.response, { email: 'a@example.com' });
  const rows = store.listFormResponses(form.id);
  assert.equal(rows.length, 1);
  assert.equal(Object.hasOwn(rows[0].response, '__consent'), false);
});

test('expired form responses are purged according to retentionDays', async (t) => {
  const dataDir = tempDir();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const store = new PlatformStore({ dataDir });
  await store.initialize();
  t.after(() => store.close());

  const form = store.createForm({ name: 'Encuesta', schema: { fields: [], retentionDays: 7 } });
  const response = store.submitForm(form.id, { answer: 'ok' });
  store.db.prepare('UPDATE form_responses SET created_at=? WHERE id=?').run('2026-01-01T00:00:00.000Z', response.id);

  const result = store.purgeExpiredFormResponses(new Date('2026-01-20T00:00:00.000Z'));
  assert.equal(result.deleted, 1);
  assert.equal(store.listFormResponses(form.id).length, 0);
});
