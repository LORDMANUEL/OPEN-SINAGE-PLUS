import { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import LoginScreen from './views/LoginScreen';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './views/DashboardView';
import ScreenListView from './views/ScreenListView';
import IntegrationView from './views/IntegrationView';

function App() {
  const { isLoggedIn } = useAppContext();
  const [currentView, setCurrentView] = useState('dashboard');

  if (!isLoggedIn) return <LoginScreen />;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'signage':
        return <ScreenListView type="signage" title="Pantallas Digital Signage" />;
      case 'kiosk':
        return <ScreenListView type="kiosk" title="Kioscos Interactivos" />;
      case 'dashboards':
        return <ScreenListView type="dashboard" title="Dashboards BI" />;
      case 'integration':
      case 'settings':
        return <IntegrationView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="ml-72 flex-1 transition-all duration-300">
        <TopBar currentView={currentView} />
        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
