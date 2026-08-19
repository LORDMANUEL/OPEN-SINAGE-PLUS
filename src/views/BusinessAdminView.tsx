import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ClipboardList, Copy, MapPin, Plus, RefreshCw, UserRoundCog } from 'lucide-react';
import { adminPlatformApi, type FormDefinition, type FormField, type FormResponse, type Location, type Organization } from '../services/adminPlatformApi';

type Tab = 'organizations' | 'forms';

export default function BusinessAdminView() {
  const [tab, setTab] = useState<Tab>('organizations');
  return <section>
    <header className="section-header"><div><span className="eyebrow">ESTRUCTURA Y DATOS</span><h2>Administración empresarial</h2><p>Empresas, sucursales, membresías y formularios táctiles sin editar archivos de configuración.</p></div></header>
    <div className="inline-actions" style={{ marginBottom: 18 }}><button className={`button ${tab === 'organizations' ? 'button--primary' : 'button--dark'}`} onClick={() => setTab('organizations')}><Building2 size={16}/> Empresas y sucursales</button><button className={`button ${tab === 'forms' ? 'button--primary' : 'button--dark'}`} onClick={() => setTab('forms')}><ClipboardList size={16}/> Formularios</button></div>
    {tab === 'organizations' ? <OrganizationsPanel/> : <FormsPanel/>}
  </section>;
}

function OrganizationsPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      const orgs = await adminPlatformApi.organizations(); setOrganizations(orgs);
      const orgId = selectedOrg || orgs[0]?.id || ''; if (orgId) setSelectedOrg(orgId);
      setLocations(orgId ? await adminPlatformApi.locations(orgId) : []); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar empresas'); }
  }, [selectedOrg]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (selectedOrg) void adminPlatformApi.locations(selectedOrg).then(rows => { setLocations(rows); setSelectedLocation(rows[0]?.id || ''); }); }, [selectedOrg]);

  async function createOrg() {
    try { const created = await adminPlatformApi.createOrganization(orgName, orgSlug); setOrgName(''); setOrgSlug(''); setSelectedOrg(created.id); setMessage('Empresa creada.'); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear empresa'); }
  }
  async function createLocation() {
    if (!selectedOrg) return;
    try { await adminPlatformApi.createLocation(selectedOrg, locationName, locationCode); setLocationName(''); setLocationCode(''); setMessage('Sucursal creada.'); setLocations(await adminPlatformApi.locations(selectedOrg)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear sucursal'); }
  }
  async function assign() {
    if (!memberEmail || !selectedOrg) return;
    try { await adminPlatformApi.assignMembership({ userEmail: memberEmail, organizationId: selectedOrg, locationId: selectedLocation || null }); setMemberEmail(''); setMessage('Membresía asignada.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo asignar membresía'); }
  }

  return <div className="studio-grid">
    <div className="workspace-panel form-grid"><div className="panel-title"><h2><Building2 size={20}/> Nueva empresa</h2><p>La empresa es el límite principal de datos y permisos.</p></div><label>Nombre<input value={orgName} onChange={e => setOrgName(e.target.value)}/></label><label>Slug<input value={orgSlug} onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="mi-empresa"/></label><button className="button button--primary" onClick={() => void createOrg()} disabled={!orgName || !orgSlug}><Plus size={16}/> Crear empresa</button></div>
    <div className="workspace-panel form-grid"><div className="panel-title"><h2><MapPin size={20}/> Sucursal</h2><p>Organiza pantallas, usuarios y campañas por sede.</p></div><label>Empresa<select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Nombre<input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="San Pedro Sula"/></label><label>Código<input value={locationCode} onChange={e => setLocationCode(e.target.value.toUpperCase())} placeholder="SPS"/></label><button className="button button--primary" onClick={() => void createLocation()} disabled={!selectedOrg || !locationName || !locationCode}><Plus size={16}/> Crear sucursal</button></div>
    <div className="workspace-panel form-grid"><div className="panel-title"><h2><UserRoundCog size={20}/> Asignar usuario</h2><p>Limita el contexto del usuario a empresa o sucursal.</p></div><label>Email<input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)}/></label><label>Empresa<select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Sucursal<select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}><option value="">Todas las sucursales</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><button className="button button--primary" onClick={() => void assign()} disabled={!memberEmail || !selectedOrg}>Asignar</button></div>
    <div className="workspace-panel"><div className="panel-title"><h2>Inventario empresarial</h2><button className="button button--dark" onClick={() => void refresh()}><RefreshCw size={15}/> Actualizar</button></div>{message && <div className="notice notice--success">{message}</div>}<div className="resource-list">{organizations.map(org => <div className="resource-row" key={org.id}><div><strong>{org.name}</strong><small>/{org.slug} · {locations.filter(location => location.organizationId === org.id).length} sucursales cargadas</small></div></div>)}</div></div>
  </div>;
}

function FormsPanel() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responses, setResponses] = useState<Record<string, FormResponse[]>>({});
  const [name, setName] = useState('Formulario de contacto');
  const [fields, setFields] = useState<FormField[]>([{ name: 'nombre', label: 'Nombre', type: 'text', required: true }]);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FormField['type']>('text');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setForms(await adminPlatformApi.forms()); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar formularios'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const generatedSlug = useMemo(() => fieldLabel.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), [fieldLabel]);

  function addField() { if (!fieldLabel.trim() || !generatedSlug) return; setFields(current => [...current, { name: generatedSlug, label: fieldLabel.trim(), type: fieldType, required: false }]); setFieldLabel(''); }
  async function createForm() {
    try { const form = await adminPlatformApi.createForm(name, { fields, submitLabel: 'Enviar', successMessage: '¡Gracias! Tu información fue recibida.' }); setMessage(`Formulario ${form.name} creado.`); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear formulario'); }
  }
  async function loadResponses(formId: string) {
    try {
      const rows = await adminPlatformApi.formResponses(formId);
      setResponses(current => ({ ...current, [formId]: rows }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron leer respuestas'); }
  }
  async function copyUrl(formId: string) { await navigator.clipboard?.writeText(adminPlatformApi.publicFormUrl(formId)); setMessage('URL pública copiada.'); }

  return <div className="studio-grid">
    <div className="workspace-panel form-grid"><div className="panel-title"><h2><ClipboardList size={20}/> Diseñador guiado</h2><p>Crea formularios para paneles táctiles, tablets o QR.</p></div><label>Nombre<input value={name} onChange={e => setName(e.target.value)}/></label><div className="form-grid"><label>Nuevo campo<input value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} placeholder="Correo electrónico"/></label><label>Tipo<select value={fieldType} onChange={e => setFieldType(e.target.value as FormField['type'])}><option value="text">Texto</option><option value="email">Email</option><option value="tel">Teléfono</option><option value="textarea">Texto largo</option><option value="checkbox">Checkbox</option></select></label><button className="button button--dark" onClick={addField} disabled={!fieldLabel}><Plus size={15}/> Agregar campo</button></div><div className="resource-list">{fields.map((field, index) => <div className="resource-row" key={`${field.name}-${index}`}><div><strong>{field.label}</strong><small>{field.type} · {field.name}</small></div><button className="button button--dark" onClick={() => setFields(current => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button></div>)}</div><button className="button button--primary" onClick={() => void createForm()} disabled={!name || fields.length === 0}>Crear formulario</button>{message && <div className="notice notice--success">{message}</div>}</div>
    <div className="workspace-panel"><div className="panel-title"><h2>Formularios publicados</h2><button className="button button--dark" onClick={() => void refresh()}><RefreshCw size={15}/> Actualizar</button></div><div className="resource-list">{forms.map(form => <div key={form.id}><div className="resource-row"><div><strong>{form.name}</strong><small>{form.schema.fields?.length || 0} campos · {form.id}</small></div><div className="inline-actions"><button className="button button--dark" onClick={() => void copyUrl(form.id)}><Copy size={15}/> URL</button><button className="button button--dark" onClick={() => void loadResponses(form.id)}>Respuestas</button></div></div>{responses[form.id] && <div style={{ padding: '8px 14px 16px' }}><small>{responses[form.id].length} respuestas</small>{responses[form.id].slice(0, 5).map(row => <pre key={row.id} style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{JSON.stringify(row.response)}</pre>)}</div>}</div>)}</div></div>
  </div>;
}
