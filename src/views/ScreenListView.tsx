import React from 'react';
import { Plus, Eye, Settings, Trash2, MapPin, Clock, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const ScreenListView = ({ type, title }) => {
  const { screens, createNewScreen, deleteScreen, setCurrentView, setSelectedScreen } = useAppContext();
  const screensList = screens[type];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{title}</h2>
          <p className="text-slate-600">Total: {screensList.length} pantallas</p>
        </div>
        <button
          onClick={() => createNewScreen(type)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
          <Plus size={20} />
          Nueva Pantalla
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {screensList.map(screen => (
          <div key={screen.id} className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-all">
                  {screen.name}
                </h3>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <MapPin size={14} />
                  {screen.zone}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  <Clock size={12} className="inline" /> {screen.lastSync}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                screen.status === 'online'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {screen.status === 'online' ? '● Online' : '● Offline'}
              </div>
            </div>

            {screen.aiGenerated && (
              <div className="mb-3 px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold inline-flex items-center gap-1">
                <Sparkles size={12} />
                Creado con IA
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                screen.orientation === 'horizontal'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {screen.orientation === 'horizontal' ? <Maximize2 size={10} className="inline" /> : <Minimize2 size={10} className="inline" />}
                {' '}{screen.orientation}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                {screen.layout}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedScreen(screen);
                  setCurrentView('preview');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all flex items-center justify-center gap-2">
                <Eye size={16} />
                Ver
              </button>
              <button className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-all">
                <Settings size={16} />
              </button>
              <button
                onClick={() => deleteScreen(type, screen.id)}
                className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScreenListView;
