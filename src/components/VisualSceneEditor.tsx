import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { Copy, Image, Monitor, QrCode, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import type { PlayerItem, PlayerScene } from '../services/openSignageApi';

type SceneFormat = '16:9' | '9:16';
type TimelineAnimation = 'none' | 'fade' | 'slide' | 'zoom';
type TimelineItem = PlayerItem & { animation?: TimelineAnimation; startAt?: number; endAt?: number };
type VisualScene = PlayerScene & { format?: SceneFormat; items: TimelineItem[] };
type Props = { scene: PlayerScene; onChange: (scene: PlayerScene) => void };
type HistoryState = { past: VisualScene[]; future: VisualScene[] };

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function itemId(item: PlayerItem, index: number) { return item.id || `item-${index + 1}`; }

const RETAIL_TEMPLATE: VisualScene = {
  name: 'Retail Promo', duration: 15, background: '#071426', format: '16:9',
  items: [
    { id: 'headline', type: 'text', text: 'OFERTA ESPECIAL', x: 7, y: 12, width: 60, height: 22, zIndex: 10, color: '#ffffff', fontSize: 72, align: 'left', animation: 'slide', startAt: 0, endAt: 15 },
    { id: 'retail-copy', type: 'text', text: 'Hasta 40% de descuento', x: 7, y: 39, width: 55, height: 15, zIndex: 11, color: '#ffffff', fontSize: 42, align: 'left', animation: 'fade', startAt: .5, endAt: 15 },
    { id: 'retail-qr', type: 'qr', value: 'https://example.com/promo', label: 'Escanea la promoción', x: 72, y: 55, width: 20, height: 30, zIndex: 12, animation: 'zoom', startAt: 1, endAt: 15 },
  ],
};
const RECEPTION_TEMPLATE: VisualScene = {
  name: 'Recepción', duration: 20, background: '#0b2039', format: '16:9',
  items: [
    { id: 'headline', type: 'text', text: 'BIENVENIDO', x: 10, y: 18, width: 80, height: 24, zIndex: 10, color: '#ffffff', fontSize: 70, align: 'center', animation: 'fade', startAt: 0, endAt: 20 },
    { id: 'welcome-copy', type: 'text', text: 'Estamos listos para atenderte', x: 15, y: 48, width: 70, height: 18, zIndex: 11, color: '#ffffff', fontSize: 38, align: 'center', animation: 'slide', startAt: .5, endAt: 20 },
  ],
};
const MENU_TEMPLATE: VisualScene = {
  name: 'Menú Digital', duration: 20, background: '#15110d', format: '9:16',
  items: [
    { id: 'headline', type: 'text', text: 'MENÚ DE HOY', x: 8, y: 8, width: 84, height: 15, zIndex: 10, color: '#ffffff', fontSize: 64, align: 'center', animation: 'fade', startAt: 0, endAt: 20 },
    { id: 'menu-copy', type: 'text', text: 'Producto destacado · L 199', x: 10, y: 58, width: 80, height: 16, zIndex: 11, color: '#ffffff', fontSize: 38, align: 'center', animation: 'slide', startAt: .5, endAt: 20 },
  ],
};

export default function VisualSceneEditor({ scene, onChange }: Props) {
  const visualScene = scene as VisualScene;
  const [selectedId, setSelectedId] = useState<string | null>(visualScene.items[0]?.id || null);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number; before: VisualScene } | null>(null);

  const selectedIndex = useMemo(() => visualScene.items.findIndex((item, index) => itemId(item, index) === selectedId), [visualScene.items, selectedId]);
  const selected = selectedIndex >= 0 ? visualScene.items[selectedIndex] : null;
  const format: SceneFormat = visualScene.format === '9:16' ? '9:16' : '16:9';

  function emit(next: VisualScene) { onChange(next); }
  function commit(next: VisualScene) {
    setHistory(current => ({ past: [...current.past.slice(-49), clone(visualScene)], future: [] }));
    emit(next);
  }
  function replaceSelected(patch: Partial<TimelineItem>) {
    if (selectedIndex < 0) return;
    const items = visualScene.items.map((item, index) => index === selectedIndex ? ({ ...item, ...patch } as TimelineItem) : item);
    commit({ ...visualScene, items });
  }
  function add(type: 'text' | 'image' | 'qr') {
    const id = crypto.randomUUID();
    const zIndex = Math.max(0, ...visualScene.items.map(item => Number(item.zIndex || 0))) + 1;
    const base = { id, x: 10, y: 10, width: 40, height: 20, zIndex, animation: 'none' as TimelineAnimation, startAt: 0, endAt: visualScene.duration || 15 };
    const item: TimelineItem = type === 'text'
      ? { ...base, type: 'text', text: 'Nuevo texto', color: '#ffffff', fontSize: 48, align: 'center' }
      : type === 'image'
        ? { ...base, type: 'image', src: 'https://placehold.co/1200x675', fit: 'cover', width: 55, height: 55 }
        : { ...base, type: 'qr', value: 'https://example.com', label: 'Escanéame', width: 22, height: 28 };
    commit({ ...visualScene, items: [...visualScene.items, item] });
    setSelectedId(id);
  }
  function applyTemplate(template: VisualScene) {
    commit(clone(template));
    setSelectedId('headline');
  }
  function switchFormat(nextFormat: SceneFormat) {
    if (nextFormat === format) return;
    const items = visualScene.items.map(item => adaptItem(item, nextFormat));
    commit({ ...visualScene, format: nextFormat, items });
  }
  function removeSelected() {
    if (selectedIndex < 0) return;
    const next = visualScene.items.filter((_, index) => index !== selectedIndex);
    commit({ ...visualScene, items: next });
    setSelectedId(next[0]?.id || null);
  }
  function duplicateSelected() {
    if (!selected) return;
    const copy = clone(selected) as TimelineItem;
    copy.id = crypto.randomUUID(); copy.x = clamp(Number(copy.x || 0) + 3); copy.y = clamp(Number(copy.y || 0) + 3);
    copy.zIndex = Math.max(0, ...visualScene.items.map(item => Number(item.zIndex || 0))) + 1;
    commit({ ...visualScene, items: [...visualScene.items, copy] }); setSelectedId(copy.id);
  }
  function undo() {
    const previous = history.past.at(-1); if (!previous) return;
    setHistory(current => ({ past: current.past.slice(0, -1), future: [clone(visualScene), ...current.future.slice(0, 49)] })); emit(clone(previous));
  }
  function redo() {
    const next = history.future[0]; if (!next) return;
    setHistory(current => ({ past: [...current.past.slice(-49), clone(visualScene)], future: current.future.slice(1) })); emit(clone(next));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, id: string, item: TimelineItem) {
    if (!canvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, startX: event.clientX, startY: event.clientY, x: Number(item.x || 0), y: Number(item.y || 0), before: clone(visualScene) };
    setSelectedId(id);
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const state = dragRef.current; const canvas = canvasRef.current; if (!state || !canvas) return;
    const rect = canvas.getBoundingClientRect(); const dx = ((event.clientX - state.startX) / rect.width) * 100; const dy = ((event.clientY - state.startY) / rect.height) * 100;
    const index = visualScene.items.findIndex((item, idx) => itemId(item, idx) === state.id); if (index < 0) return;
    const items = visualScene.items.map((item, idx) => idx === index ? ({ ...item, x: clamp(state.x + dx), y: clamp(state.y + dy) } as TimelineItem) : item);
    emit({ ...visualScene, items });
  }
  function endDrag() {
    const state = dragRef.current; if (!state) return;
    setHistory(current => ({ past: [...current.past.slice(-49), state.before], future: [] })); dragRef.current = null;
  }

  return <div className="workspace-panel">
    <div className="panel-title"><h2><Monitor size={20}/> Editor visual</h2><p>Plantillas, formatos responsive, capas, timeline y edición directa.</p></div>
    <div className="inline-actions">
      <button className="button button--dark" type="button" onClick={() => applyTemplate(RETAIL_TEMPLATE)}>Plantilla Retail</button>
      <button className="button button--dark" type="button" onClick={() => applyTemplate(RECEPTION_TEMPLATE)}>Plantilla Recepción</button>
      <button className="button button--dark" type="button" onClick={() => applyTemplate(MENU_TEMPLATE)}>Plantilla Menú</button>
      <button className="button button--dark" type="button" onClick={() => switchFormat('16:9')}>16:9 Horizontal</button>
      <button className="button button--dark" type="button" onClick={() => switchFormat('9:16')}>9:16 Vertical</button>
    </div>
    <div className="inline-actions" style={{ marginTop: 8 }}>
      <button className="button button--dark" type="button" onClick={() => add('text')}><Type size={15}/> Texto</button>
      <button className="button button--dark" type="button" onClick={() => add('image')}><Image size={15}/> Imagen</button>
      <button className="button button--dark" type="button" onClick={() => add('qr')}><QrCode size={15}/> QR</button>
      <button className="button button--dark" type="button" disabled={!history.past.length} onClick={undo}><Undo2 size={15}/> Undo</button>
      <button className="button button--dark" type="button" disabled={!history.future.length} onClick={redo}><Redo2 size={15}/> Redo</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 290px', gap: 18, marginTop: 16 }}>
      <div ref={canvasRef} data-testid="visual-scene-canvas" data-format={format} style={{ position: 'relative', aspectRatio: format === '9:16' ? '9 / 16' : '16 / 9', maxHeight: format === '9:16' ? 650 : undefined, margin: format === '9:16' ? '0 auto' : undefined, overflow: 'hidden', borderRadius: 12, background: visualScene.background || '#071426', border: '1px solid rgba(255,255,255,.14)' }}>
        {visualScene.items.map((item, index) => {
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
        <label>Nombre<input value={visualScene.name} onChange={event => commit({ ...visualScene, name: event.target.value })}/></label>
        <label>Fondo<input value={visualScene.background || ''} onChange={event => commit({ ...visualScene, background: event.target.value })}/></label>
        <label>Duración s<input type="number" min="1" max="86400" value={visualScene.duration || 15} onChange={event => commit({ ...visualScene, duration: Math.max(1, Number(event.target.value || 1)) })}/></label>
        {selected && <>
          <hr/><strong>{selected.type.toUpperCase()}</strong>
          <div className="form-grid">
            <NumberField label="X %" value={selected.x} onChange={x => replaceSelected({ x })}/><NumberField label="Y %" value={selected.y} onChange={y => replaceSelected({ y })}/>
            <NumberField label="Ancho %" value={selected.width} onChange={width => replaceSelected({ width: clamp(width, 1, 100) })}/><NumberField label="Alto %" value={selected.height} onChange={height => replaceSelected({ height: clamp(height, 1, 100) })}/>
            <NumberField label="Capa" value={selected.zIndex} onChange={zIndex => replaceSelected({ zIndex: Math.round(zIndex) })}/>
            <label>Animación<select value={selected.animation || 'none'} onChange={event => replaceSelected({ animation: event.target.value as TimelineAnimation })}><option value="none">Sin animación</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option></select></label>
            <NumberField label="Inicio s" value={selected.startAt ?? 0} min={0} max={visualScene.duration || 15} onChange={startAt => replaceSelected({ startAt: clamp(startAt, 0, visualScene.duration || 15) })}/>
            <NumberField label="Fin s" value={selected.endAt ?? visualScene.duration ?? 15} min={0} max={visualScene.duration || 15} onChange={endAt => replaceSelected({ endAt: clamp(endAt, 0, visualScene.duration || 15) })}/>
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

function adaptItem(item: TimelineItem, format: SceneFormat): TimelineItem {
  if (format === '9:16') {
    if (item.type === 'qr') return { ...item, x: 58, y: Math.max(55, Number(item.y || 0)), width: Math.min(34, Math.max(24, Number(item.width || 24))), height: Math.min(28, Math.max(20, Number(item.height || 24))) };
    if (item.type === 'text' || item.type === 'button') return { ...item, x: 8, width: 84, y: clamp(Number(item.y || 0), 5, 82), height: Math.min(24, Math.max(10, Number(item.height || 16))) };
    return { ...item, x: 5, width: 90, y: clamp(Number(item.y || 0), 0, 75), height: Math.min(55, Math.max(25, Number(item.height || 45))) };
  }
  if (item.type === 'qr') return { ...item, x: 75, y: Math.max(55, Number(item.y || 0)), width: 20, height: 28 };
  if (item.type === 'text' || item.type === 'button') return { ...item, x: Math.min(12, Number(item.x || 0)), width: Math.max(55, Math.min(84, Number(item.width || 70))), height: Math.min(24, Number(item.height || 18)) };
  return { ...item, x: 0, y: 0, width: 100, height: 100 };
}

function NumberField({ label, value, min, max, onChange }: { label: string; value?: number; min?: number; max?: number; onChange: (value: number) => void }) { return <label>{label}<input type="number" min={min} max={max} step="0.1" value={Number(value ?? 0)} onChange={event => onChange(Number(event.target.value || 0))}/></label>; }
