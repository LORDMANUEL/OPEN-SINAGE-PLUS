import { MapPin, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react';
import { useAppContext, type ScreenType } from '../context/app-context';

type ScreenListViewProps = { type: ScreenType; title: string };

export default function ScreenListView({ type, title }: ScreenListViewProps) {
  const { screens, createNewScreen, deleteScreen } = useAppContext();
  const list = screens[type];

  return (
    <section className="screen-view">
      <div className="section-header"><div><span className="eyebrow">INVENTARIO LOCAL</span><h2>{title}</h2><p>Estos registros sirven para la capa visual. Los displays reales del motor se administran en Motor Xibo.</p></div><button type="button" className="button button--primary" onClick={() => createNewScreen(type)}><Plus size={18} /> Nueva pantalla</button></div>
      <div className="screen-grid">
        {list.map(screen => (
          <article className="screen-card" key={screen.id}>
            <div className="screen-card__preview"><span>{screen.orientation === 'horizontal' ? <Maximize2 size={26} /> : <Minimize2 size={26} />}</span><b>{screen.orientation === 'horizontal' ? '16:9' : '9:16'}</b></div>
            <div className="screen-card__body"><div className="screen-card__title"><div><h3>{screen.name}</h3><p><MapPin size={14} /> {screen.zone}</p></div><span className={`status-dot ${screen.status === 'online' ? 'status-dot--online' : ''}`}>{screen.status}</span></div><div className="screen-card__meta"><span>{screen.layout}</span><small>Sync: {screen.lastSync}</small></div><button className="icon-button icon-button--danger" type="button" aria-label={`Eliminar ${screen.name}`} onClick={() => deleteScreen(type, screen.id)}><Trash2 size={16} /></button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
