import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { adminPlatformApi, type FormDefinition, type FormField } from '../services/adminPlatformApi';

export default function FormScreen({ formId }: { formId: string }) {
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void adminPlatformApi.publicForm(formId).then(setForm).catch(error => setMessage(error instanceof Error ? error.message : 'Formulario no disponible')); }, [formId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!form) return;
    setBusy(true); setMessage('');
    try {
      for (const field of form.schema.fields || []) if (field.required && !values[field.name]) throw new Error(`${field.label || field.name} es obligatorio`);
      await adminPlatformApi.submitPublicForm(form.id, values);
      setSubmitted(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo enviar'); }
    finally { setBusy(false); }
  }

  if (!form && !message) return <main className="pairing-stage"><div className="pairing-card"><ClipboardList size={42}/><h1>Cargando formulario…</h1></div></main>;
  if (!form) return <main className="pairing-stage"><div className="pairing-card"><h1>Formulario no disponible</h1><p>{message}</p></div></main>;
  if (submitted) return <main className="pairing-stage"><div className="pairing-card"><CheckCircle2 size={52}/><h1>{form.schema.successMessage || '¡Gracias!'}</h1><p>La respuesta fue registrada correctamente.</p></div></main>;

  return <main className="pairing-stage" style={{ overflowY: 'auto', padding: 24 }}><form className="pairing-card form-grid" style={{ width: 'min(720px, 94vw)', textAlign: 'left' }} onSubmit={submit}><div style={{ textAlign: 'center' }}><ClipboardList size={42}/><h1>{form.name}</h1><p>Completa los campos y pulsa enviar.</p></div>{(form.schema.fields || []).map(field => <Field key={field.name} field={field} value={values[field.name]} onChange={value => setValues(current => ({ ...current, [field.name]: value }))}/>) }{message && <div className="notice notice--error">{message}</div>}<button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : form.schema.submitLabel || 'Enviar'}</button></form></main>;
}

function Field({ field, value, onChange }: { field: FormField; value: unknown; onChange: (value: unknown) => void }) {
  const label = field.label || field.name;
  if (field.type === 'textarea') return <label>{label}{field.required ? ' *' : ''}<textarea rows={5} value={String(value || '')} onChange={e => onChange(e.target.value)} required={field.required}/></label>;
  if (field.type === 'select') return <label>{label}{field.required ? ' *' : ''}<select value={String(value || '')} onChange={e => onChange(e.target.value)} required={field.required}><option value="">Seleccione…</option>{(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
  if (field.type === 'checkbox') return <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} style={{ width: 24, height: 24 }}/>{label}{field.required ? ' *' : ''}</label>;
  return <label>{label}{field.required ? ' *' : ''}<input type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'} value={String(value || '')} onChange={e => onChange(e.target.value)} required={field.required} autoComplete="off"/></label>;
}
