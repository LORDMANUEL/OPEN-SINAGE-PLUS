import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Copy, Image, Monitor, QrCode, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import type { PlayerItem, PlayerScene } from '../services/openSignageApi';

type Props = { scene: PlayerScene; onChange: (scene: PlayerScene) => void };
type HistoryState = { past: PlayerScene[]; future: PlayerScene[] };

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function itemId(item: PlayerItem, index: number) { return item.id || `item-${index + 1}`; }

export default function VisualSceneEditor({ scene, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(scene.items[0]?.id || null);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null);

  const selectedIndex = useMemo(() => scene.items.findIndex((item, index) => itemId(item, index) === selectedId), [scene.items, selectedId]);
  const selected = selectedIndex >= 0 ? scene.items[selectedIndex] : null;

  function commit(next: PlayerScene) {
    setHistory(current => ({ past: [...current.past.slice(-49), clone(scene)], future: [] }));
    onChange(next);
  }
  function replaceSelected(patch: Partial<PlayerItem>) {
    if (selectedIndex < 0) return;
    const items = scene.items.map((item, index) => index === selectedIndex ? ({ ...item, ...patch } as PlayerItem) : item);
    commit({ ...scene, items });
  }
  function add(type: 'text' | 'image' | 'qr') {
    const id = crypto.randomUUID();
    const zIndex = Math.max(0, ...scene.items.map(item => Number(item.zIndex || 0))) + 1;
    const base = { id, x: 10, y: 10, width: 40, height: 20, zIndex };
    const item: PlayerItem = type === 'text'
      ? { ...base, type: 'text', text: 'Nuevo texto', color: '#ffffff', fontSize: 48, align: 'center' }
      : type === 'image'
        ? { ...base, type: 'image', src: 'https://placehold.co/1200x675', fit: 'cover', width: 55, height: 55 }
        : { ...base, type: 'qr', value: 'https://example.com', label: 'Escanéame', width: 22, height: 28 };
    commit({ ...scene, items: [...scene.items, item] });
    setSelectedId(id);
  }
  function removeSelected() {
    if (selectedIndex < 0) return;
    const next = scene.items.filter((_, index) => index !== selectedIndex);
    commit({ ...scene, items: next });
    setSelectedId(next[0]?.id || null);
  }
  function duplicateSelected() {
    if (!selected) return;
    const copy = clone(selected) as PlayerItem;
    copy.id = crypto.randomUUID();
    copy.x = clamp(Number(copy.x || 0) + 3);
    copy.y = clamp(Number(copy.y || 0) + 3);
    copy.zIndex = Math.max(0, ...scene.items.map(item => Number(item.zIndex || 0))) + 1;
    commit({ ...scene, items: [...scene.items, copy] });
    setSelectedId(copy.id);
  }
  function undo() {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory(current => ({ past: current.past.slice(0, -1), future: [clone(scene), ...current.future.slice(0, 49)] }));
    onChange(clone(previous));
  }
  function redo() {
    const next = history.future[0];
    if (!next) return;
    setHistory(current => ({ past: [...current.past.slice(-49), clone(scene)], future: current.future.slice(1) }));
    onChange(clone(next));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, id: string, item: PlayerItem) {
    if (!canvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, startX: event.clientX, startY: event.clientY, x: Number(item.x || 0), y: Number(item.y || 0) };
    setSelectedId(id);
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = ((event.clientX - state.startX) / rect.width) * 100;
    const dy = ((event.clientY - state.startY) / rect.height) * 100;
    const index = scene.items.findIndex((item, idx) => itemId(item, idx) === state.id);
    if (index < 0) return;
    const items = scene.items.map((item, idx) => idx === index ? ({ ...item, x: clamp(state.x + dx), y: clamp(state.y + dy) } as PlayerItem) : item);
    onChange({ ...scene, items });
  }
  function endDrag() {
    if (!dragRef.current) return;
    setHistory(current => ({ past: [...current.past.slice(-49), clone(scene)], future: [] }));
    dragRef.current = null;
  }

  return <div className="workspace-panel">
    <div className="panel-title"><h2><Monitor size={20}/> Editor visual</h2><p>Arrastra elementos, modifica posición/tamaño, controla capas y usa undo/redo.</p></div>
    <div className="inline-actions">
      <button className="button button--dark" type="button" onClick={() => add('text')}><Type size={15}/> Texto</button>
      <button className="button button--dark" type="button" onClick={() => add('image')}><Image size={15}/> Imagen</button>
      <button className="button button--dark" type="button" onClick={() => add('qr')}><QrCode size={15}/> QR</button>
      <button className="button button--dark" type="button" disabled={!history.past.length} onClick={undo}><Undo2 size={15}/> Undo</button>
      <button className="button button--dark" type="button" disabled={!history.future.length} onClick={redo}><Redo2 size={15}/> Redo</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18, marginTop: 16 }}>
      <div ref={canvasRef} style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 12, background: scene.background || '#071426', border: '1px solid rgba(255,255,255,.14)' }}>
        {scene.items.map((item, index) => {
          const id = itemId(item, index);
          const style = { position: 'absolute' as const, left: `${item.x ?? 0}%`, top: `${item.y ?? 0}%`, width: `${item.width ?? 100}%`, height: `${item.height ?? 100}%`, zIndex: item.zIndex ?? index, outline: selectedId === id ? '2px solid #64a3ff' : '1px dashed rgba(255,255,255,.2)', cursor: 'move', overflow: 'hidden' };
          return <div key={id} style={style} onPointerDown={event => startDrag(event, id, item)} onPointerMove={drag} onPointerUp={endDrag}>
            {item.type === 'text' && <div style={{ color: item.color || '#fff', fontSize: `${Math.max(10, Number(item.fontSize || 48) / 2)}px`, textAlign: item.align || 'center', padding: 8 }}>{item.text}</div>}
            {item.type === 'image' && <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: item.fit || 'cover', pointerEvents: 'none' }}/>} 
            {item.type === 'video' && <div style={{ display: 'grid', placeItems: 'center', height: '100%', background: '#111' }}>VIDEO</div>}
            {item.type === 'qr' && <div style={{ display: 'grid', placeItems: 'center', height: '100%', background: '#fff', color: '#111' }}>QR<br/><small>{item.label}</small></div>}
            {item.type === 'button' && <div style={{ display: 'grid', placeItems: 'center', height: '100%', background: item.background || '#2166f3', color: item.color || '#fff' }}>{item.text}</div>}
            {item.type === 'html' && <div style={{ padding: 8 }}>HTML</div>}
          </div>;
        })}
      </div>
      <aside>
        <label>Nombre<input value={scene.name} onChange={event => commit({ ...scene, name: event.target.value })}/></label>
        <label>Fondo<input value={scene.background || ''} onChange={event => commit({ ...scene, background: event.target.value })}/></label>
        {selected && <>
          <hr/>
          <strong>{selected.type.toUpperCase()}</strong>
          <div className="form-grid">
            <NumberField label="X %" value={selected.x} onChange={x => replaceSelected({ x })}/><NumberField label="Y %" value={selected.y} onChange={y => replaceSelected({ y })}/>
            <NumberField label="Ancho %" value={selected.width} onChange={width => replaceSelected({ width: clamp(width, 1, 100) })}/><NumberField label="Alto %" value={selected.height} onChange={height => replaceSelected({ height: clamp(height, 1, 100) })}/>
            <NumberField label="Capa" value={selected.zIndex} onChange={zIndex => replaceSelected({ zIndex: Math.round(zIndex) })}/>
            {selected.type === 'text' && <><label>Texto<textarea value={selected.text} onChange={event => replaceSelected({ text: event.target.value })}/></label><NumberField label="Tamaño" value={selected.fontSize} onChange={fontSize => replaceSelected({ fontSize })}/></>}
            {(selected.type === 'image' || selected.type === 'video') && <label>URL<input value={selected.src} onChange={event => replaceSelected({ src: event.target.value })}/></label>}
            {selected.type === 'qr' && <label>Valor<input value={selected.value} onChange={event => replaceSelected({ value: event.target.value })}/></label>}
          </div>
          <div className="inline-actions"><button className="button button--dark" type="button" onClick={duplicateSelected}><Copy size={15}/> Duplicar</button><button className="button button--dark" type="button" onClick={removeSelected}><Trash2 size={15}/> Eliminar</button></div>
        </>}
      </aside>
    </div>
  </div>;
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number) => void }) { return <label>{label}<input type="number" value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value || 0))}/></label>; }
