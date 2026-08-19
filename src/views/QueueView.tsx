import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ListOrdered, PhoneCall, Plus } from 'lucide-react';
import { openSignageApi, type Ticket } from '../services/openSignageApi';

export default function QueueView() {
  const [queue, setQueue] = useState('recepcion');
  const [prefix, setPrefix] = useState('R');
  const [desk, setDesk] = useState('Módulo 1');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setTickets(await openSignageApi.listTickets(queue)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo leer la cola'); }
  }, [queue]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(timer); }, [refresh]);

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
        <div><span className="eyebrow">TURNOS Y COLAS</span><h2>Queue Center</h2><p>Emite turnos desde QR, kiosco táctil o administración y llama al siguiente en tiempo real por refresco ligero.</p></div>
      </header>

      <div className="queue-controls workspace-panel form-grid">
        <label>Cola<input value={queue} onChange={e => setQueue(e.target.value.toLowerCase())}/></label>
        <label>Prefijo<input value={prefix} maxLength={3} onChange={e => setPrefix(e.target.value.toUpperCase())}/></label>
        <label>Módulo / escritorio<input value={desk} onChange={e => setDesk(e.target.value)}/></label>
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
        <div className="panel-title"><h2><ListOrdered size={20}/> Cola {queue}</h2><p>Los tickets se guardan en el volumen persistente de Open Signage.</p></div>
        <div className="resource-list">
          {tickets.length === 0 && <div className="empty-state">No hay turnos en esta cola.</div>}
          {tickets.slice().reverse().map(ticket => <div className="resource-row" key={ticket.id}>
            <div><strong>{ticket.number} · {ticket.status}</strong><small>{ticket.desk || 'Sin módulo'}{ticket.customerName ? ` · ${ticket.customerName}` : ''}</small></div>
            {ticket.status === 'called' && <button className="button button--primary" type="button" onClick={() => void complete(ticket)} disabled={busy}><CheckCircle2 size={15}/> Completar</button>}
          </div>)}
        </div>
      </div>
    </section>
  );
}
