import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ListOrdered, PhoneCall, Plus, Volume2 } from 'lucide-react';
import { openSignageApi, type Ticket } from '../services/openSignageApi';

export default function QueueView() {
  const [queue, setQueue] = useState('recepcion');
  const [prefix, setPrefix] = useState('R');
  const [desk, setDesk] = useState('Módulo 1');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('open-signage-queue-tts') === '1');
  const [voiceLang, setVoiceLang] = useState(() => localStorage.getItem('open-signage-queue-tts-lang') || 'es-HN');

  const refresh = useCallback(async () => {
    try { setTickets(await openSignageApi.listTickets(queue)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo leer la cola'); }
  }, [queue]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(timer); }, [refresh]);

  function configureVoice(enabled: boolean) {
    setVoiceEnabled(enabled);
    localStorage.setItem('open-signage-queue-tts', enabled ? '1' : '0');
    if (!enabled) window.speechSynthesis?.cancel();
  }
  function announce(ticket: Ticket) {
    if (!voiceEnabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    const text = `Turno ${spellTicket(ticket.number)}, pasar a ${ticket.desk || desk}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const preferred = voices.find(voice => voice.lang.toLowerCase() === voiceLang.toLowerCase()) || voices.find(voice => voice.lang.toLowerCase().startsWith(voiceLang.slice(0, 2).toLowerCase()));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function issue() {
    setBusy(true); setMessage('');
    try {
      const ticket = await openSignageApi.issueTicket(queue, prefix);
      setMessage(`Turno ${ticket.number} creado.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear turno'); }
    finally { setBusy(false); }
  }

  async function callNext() {
    setBusy(true); setMessage('');
    try {
      const ticket = await openSignageApi.callNextTicket(queue, desk);
      setMessage(`Llamando ${ticket.number} → ${desk}`);
      announce(ticket);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No hay turnos pendientes'); }
    finally { setBusy(false); }
  }

  async function complete(ticket: Ticket) {
    setBusy(true); setMessage('');
    try { await openSignageApi.completeTicket(queue, ticket.id); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo completar'); }
    finally { setBusy(false); }
  }

  const waiting = tickets.filter(t => t.status === 'waiting');
  const called = tickets.filter(t => t.status === 'called');
  const completed = tickets.filter(t => t.status === 'completed');

  return (
    <section className="queue-view">
      <header className="section-header">
        <div><span className="eyebrow">TURNOS Y COLAS</span><h2>Queue Center</h2><p>Emite turnos desde QR, kiosco táctil o administración, prioriza y anuncia llamados por voz local del navegador.</p></div>
      </header>

      <div className="queue-controls workspace-panel form-grid">
        <label>Cola<input value={queue} onChange={e => setQueue(e.target.value.toLowerCase())}/></label>
        <label>Prefijo<input value={prefix} maxLength={3} onChange={e => setPrefix(e.target.value.toUpperCase())}/></label>
        <label>Módulo / escritorio<input value={desk} onChange={e => setDesk(e.target.value)}/></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9 }}><input aria-label="Anunciar turnos por voz" type="checkbox" checked={voiceEnabled} onChange={event => configureVoice(event.target.checked)} style={{ width: 18, height: 18 }}/><Volume2 size={17}/> Anunciar turnos por voz</label>
        <label>Idioma de voz<select value={voiceLang} onChange={event => { setVoiceLang(event.target.value); localStorage.setItem('open-signage-queue-tts-lang', event.target.value); }}><option value="es-HN">Español Honduras</option><option value="es-MX">Español Latinoamérica</option><option value="es-ES">Español España</option><option value="en-US">English US</option></select></label>
        <div className="inline-actions">
          <button className="button button--primary" type="button" onClick={() => void issue()} disabled={busy}><Plus size={16}/> Emitir turno</button>
          <button className="button button--dark" type="button" onClick={() => void callNext()} disabled={busy}><PhoneCall size={16}/> Llamar siguiente</button>
        </div>
        {message && <div className="notice notice--success">{message}</div>}
      </div>

      <div className="queue-summary">
        <div className="metric-card"><span>Esperando</span><strong>{waiting.length}</strong><small>por atender</small></div>
        <div className="metric-card"><span>Llamados</span><strong>{called.length}</strong><small>en atención</small></div>
        <div className="metric-card"><span>Completados</span><strong>{completed.length}</strong><small>histórico actual</small></div>
      </div>

      <div className="workspace-panel">
        <div className="panel-title"><h2><ListOrdered size={20}/> Cola {queue}</h2><p>Los tickets conservan prioridad, servicio, SLA y persistencia en Open Signage.</p></div>
        <div className="resource-list">
          {tickets.length === 0 && <div className="empty-state">No hay turnos en esta cola.</div>}
          {tickets.slice().reverse().map(ticket => <div className="resource-row" key={ticket.id}>
            <div><strong>{ticket.number} · {ticket.status}</strong><small>{ticket.desk || 'Sin módulo'}{ticket.service ? ` · ${ticket.service}` : ''}{ticket.customerName ? ` · ${ticket.customerName}` : ''}{Number(ticket.priority || 0) > 0 ? ` · prioridad ${ticket.priority}` : ''}</small></div>
            {ticket.status === 'called' && <button className="button button--primary" type="button" onClick={() => void complete(ticket)} disabled={busy}><CheckCircle2 size={15}/> Completar</button>}
          </div>)}
        </div>
      </div>
    </section>
  );
}

function spellTicket(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return text;
  return `${match[1].split('').join(' ')}, ${Number(match[2])}`;
}
