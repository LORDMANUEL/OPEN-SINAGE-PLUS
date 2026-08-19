import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { useAppContext } from './context/app-context';
import LoginScreen from './views/LoginScreen';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './views/DashboardView';
import ScreenListView from './views/ScreenListView';
import IntegrationView from './views/IntegrationView';
import StudioView from './views/StudioView';
import MediaView from './views/MediaView';
import PlayerScreen from './views/PlayerScreen';
import DeviceScreen from './views/DeviceScreen';
import AiStudioView from './views/AiStudioView';
import QueueView from './views/QueueView';
import OperationsView from './views/OperationsView';
import BusinessAdminView from './views/BusinessAdminView';
import PlanningAnalyticsView from './views/PlanningAnalyticsView';
import FormScreen from './views/FormScreen';

function App() {
  const { isLoggedIn, authReady } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');
  if (!authReady) return <main className="player-loading"><div><strong>Open Signage Plus</strong><span>Verificando sesión…</span></div></main>;
  if (!isLoggedIn) return <LoginScreen />;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'studio': return <StudioView />;
      case 'ai': return <AiStudioView />;
      case 'media': return <MediaView />;
      case 'queues': return <QueueView />;
      case 'operations': return <OperationsView />;
      case 'business': return <BusinessAdminView />;
      case 'planning': return <PlanningAnalyticsView />;
      case 'signage': return <ScreenListView type="signage" title="Pantallas Xibo" />;
      case 'kiosk': return <ScreenListView type="kiosk" title="Kioscos y Browser Players" />;
      case 'dashboards': return <ScreenListView type="dashboard" title="Layouts y Dashboards Xibo" />;
      case 'integration':
      case 'settings': return <IntegrationView />;
      default: return <DashboardView />;
    }
  };
  return <div className="app-shell"><Sidebar currentView={currentView} setCurrentView={setCurrentView} /><div className="app-content"><TopBar currentView={currentView} /><main className="app-main">{renderContent()}</main></div></div>;
}

function getPlayerTokenFromPath() { const match = window.location.pathname.match(/^\/player\/([a-zA-Z0-9_-]{12,128})\/?$/); return match?.[1] ?? null; }
function getDeviceTokenFromPath() { if (/^\/screen\/?$/.test(window.location.pathname)) return ''; const match = window.location.pathname.match(/^\/screen\/([a-zA-Z0-9_-]{20,128})\/?$/); return match?.[1] ?? null; }
function getFormIdFromPath() { const match = window.location.pathname.match(/^\/form\/([a-zA-Z0-9_-]{8,128})\/?$/); return match?.[1] ?? null; }

export default function AppWrapper() {
  const playerToken = getPlayerTokenFromPath(); if (playerToken) return <PlayerScreen token={playerToken} />;
  const deviceToken = getDeviceTokenFromPath(); if (deviceToken !== null) return <DeviceScreen initialToken={deviceToken || null} />;
  const formId = getFormIdFromPath(); if (formId) return <FormScreen formId={formId} />;
  return <AppProvider><App /></AppProvider>;
}
