import React from 'react';
import { Monitor, CheckCircle, Package, AlertCircle, Wand2, Upload, Save, ChevronRight, BarChart3, Smartphone, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const DashboardView = () => {
  const { screens, mediaLibrary, tickets, createBackup, hasPermission, setCurrentView } = useAppContext();

  const totalScreens = screens.signage.length + screens.kiosk.length + screens.dashboard.length;
  const onlineScreens = [...screens.signage, ...screens.kiosk, ...screens.dashboard]
    .filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-6">
        {[
          {
            label: 'Total Pantallas',
            value: totalScreens,
            icon: Monitor,
            color: 'from-blue-500 to-cyan-500',
            change: '+2',
            subtitle: 'Activas en sistema'
          },
          {
            label: 'Pantallas Online',
            value: onlineScreens,
            icon: CheckCircle,
            color: 'from-green-500 to-emerald-500',
            change: `${Math.round((onlineScreens/totalScreens)*100)}%`,
            subtitle: 'Uptime excelente'
          },
          {
            label: 'Media Assets',
            value: mediaLibrary.length,
            icon: Package,
            color: 'from-purple-500 to-pink-500',
            change: '+5',
            subtitle: 'Archivos disponibles'
          },
          {
            label: 'Tickets Activos',
            value: tickets.filter(t => t.status === 'pending').length,
            icon: AlertCircle,
            color: 'from-orange-500 to-red-500',
            change: tickets.length > 0 ? 'Atención' : 'OK',
            subtitle: 'Requieren acción'
          }
        ].map((stat, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-all`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <div className={`text-sm font-bold ${
                stat.change.includes('+') ? 'text-green-600' :
                stat.change === 'Atención' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</div>
            <div className="text-sm text-slate-600">{stat.label}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => setCurrentView('ai-generator')}
          className="p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <Wand2 size={32} className="mb-3 group-hover:rotate-12 transition-all" />
          <h3 className="text-xl font-bold mb-1">Crear con IA</h3>
          <p className="text-purple-100 text-sm">Genera pantallas automáticamente con Claude</p>
        </button>

        <button
          onClick={() => setCurrentView('media')}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-left group"
        >
          <Upload size={32} className="mb-3 group-hover:-translate-y-1 transition-all" />
          <h3 className="text-xl font-bold mb-1">Subir Media</h3>
          <p className="text-blue-100 text-sm">Videos, imágenes y animaciones</p>
        </button>

        {hasPermission('backups') && (
          <button
            onClick={createBackup}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-left group"
          >
            <Save size={32} className="mb-3 group-hover:scale-110 transition-all" />
            <h3 className="text-xl font-bold mb-1">Crear Backup</h3>
            <p className="text-green-100 text-sm">Respaldo completo del sistema</p>
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer"
             onClick={() => setCurrentView('signage')}>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Monitor className="text-blue-500" />
            Digital Signage
          </h3>
          <div className="text-4xl font-bold text-blue-600 mb-2">{screens.signage.length}</div>
          <div className="text-sm text-slate-600 mb-3">
            {screens.signage.filter(s => s.status === 'online').length} online
          </div>
          <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Ver todas <ChevronRight size={16} />
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer"
             onClick={() => setCurrentView('kiosk')}>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Smartphone className="text-green-500" />
            Kioscos
          </h3>
          <div className="text-4xl font-bold text-green-600 mb-2">{screens.kiosk.length}</div>
          <div className="text-sm text-slate-600 mb-3">
            {screens.kiosk.filter(s => s.status === 'online').length} online
          </div>
          <button className="text-sm text-green-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer"
             onClick={() => setCurrentView('dashboards')}>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-purple-500" />
            Dashboards
          </h3>
          <div className="text-4xl font-bold text-purple-600 mb-2">{screens.dashboard.length}</div>
          <div className="text-sm text-slate-600 mb-3">
            {screens.dashboard.filter(s => s.status === 'online').length} online
          </div>
          <button className="text-sm text-purple-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="text-blue-500" />
          Actividad Reciente
        </h3>
        <div className="space-y-3">
          {[...screens.signage, ...screens.kiosk, ...screens.dashboard]
            .sort((a, b) => new Date(b.lastSync) - new Date(a.lastSync))
            .slice(0, 5)
            .map(screen => (
              <div key={screen.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    screen.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-slate-800">{screen.name}</div>
                    <div className="text-xs text-slate-600">{screen.zone}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Sync: {screen.lastSync}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
