import { useEffect, useState, type FormEvent } from 'react';
import { FileImage, RefreshCw, UploadCloud } from 'lucide-react';
import { openSignageApi, type XiboMedia } from '../services/openSignageApi';

export default function MediaView() {
  const [media, setMedia] = useState<XiboMedia[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('open-signage');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    setLoading(true);
    setMessage('');
    try {
      setMedia(await openSignageApi.xiboLibrary());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar la biblioteca Xibo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage('Selecciona un archivo primero.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const uploaded = await openSignageApi.uploadMedia(file, name.trim() || undefined, tags.trim() || undefined);
      setMessage(`${uploaded.length || 1} archivo(s) enviado(s) a Xibo.`);
      setFile(null);
      setName('');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo subir el archivo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="media-view">
      <header className="section-header">
        <div>
          <span className="eyebrow">BIBLIOTECA XIBO</span>
          <h2>Media</h2>
          <p>Sube imágenes, video y otros recursos directamente al CMS desde Open Signage Plus.</p>
        </div>
        <button className="button button--dark" type="button" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </header>

      <div className="media-grid-layout">
        <form className="workspace-panel form-grid" onSubmit={upload}>
          <div className="panel-title">
            <h2><UploadCloud size={20} /> Subir contenido</h2>
            <p>El archivo viaja al gateway y de allí a la API de Xibo. Las credenciales nunca llegan al navegador.</p>
          </div>
          <label>
            Archivo
            <input
              aria-label="Archivo multimedia"
              type="file"
              accept="image/*,video/*,.pdf,.html,.zip"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label>
            Nombre amigable
            <input value={name} onChange={event => setName(event.target.value)} placeholder={file?.name || 'Promoción Agosto'} />
          </label>
          <label>
            Tags
            <input value={tags} onChange={event => setTags(event.target.value)} placeholder="open-signage,campaña" />
          </label>
          {file && (
            <div className="upload-summary">
              <strong>{file.name}</strong>
              <span>{formatBytes(file.size)} · {file.type || 'tipo desconocido'}</span>
            </div>
          )}
          <button className="button button--primary" type="submit" disabled={uploading || !file}>
            <UploadCloud size={18} /> {uploading ? 'Subiendo…' : 'Subir a Xibo'}
          </button>
          {message && <div className="notice notice--success">{message}</div>}
        </form>

        <div className="workspace-panel">
          <div className="panel-title">
            <h2>Biblioteca actual</h2>
            <p>{media.length} elementos disponibles.</p>
          </div>
          {loading ? (
            <div className="empty-state">Cargando biblioteca…</div>
          ) : media.length === 0 ? (
            <div className="empty-state">La biblioteca está vacía o Xibo aún no está conectado.</div>
          ) : (
            <div className="resource-list">
              {media.map((item, index) => (
                <div className="resource-row" key={String(item.mediaId ?? index)}>
                  <div className="resource-row__main">
                    <span className="resource-icon"><FileImage size={18} /></span>
                    <div>
                      <strong>{String(item.name ?? item.fileName ?? `Media ${index + 1}`)}</strong>
                      <small>ID {String(item.mediaId ?? '—')} · {String(item.mediaType ?? 'archivo')} · {formatBytes(Number(item.fileSize || 0))}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
