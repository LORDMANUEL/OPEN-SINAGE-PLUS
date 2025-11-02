import React, { createContext, useState, useContext } from 'react';
import {
  initialApiKeys,
  initialScreens,
  initialMediaLibrary,
  initialBackups,
  initialTickets,
  users,
} from '../data/mockData';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [screens, setScreens] = useState(initialScreens);
  const [mediaLibrary, setMediaLibrary] = useState(initialMediaLibrary);
  const [backups, setBackups] = useState(initialBackups);
  const [tickets, setTickets] = useState(initialTickets);
  const [notifications, setNotifications] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState(null);

  const createNewScreen = (type) => {
    const typeNames = {
      signage: 'Digital Signage',
      kiosk: 'Kiosko',
      dashboard: 'Dashboard'
    };

    const newScreen = {
      id: Date.now(),
      name: `Nueva ${typeNames[type]} ${screens[type].length + 1}`,
      zone: 'Sin asignar',
      status: 'offline',
      orientation: type === 'kiosk' ? 'vertical' : 'horizontal',
      layout: 'default',
      lastSync: 'Nunca'
    };

    setScreens({
      ...screens,
      [type]: [...screens[type], newScreen]
    });

    addNotification('success', `Nueva pantalla creada: ${newScreen.name}`);
  };

  const deleteScreen = (type, id) => {
    if (window.confirm('¿Está seguro de eliminar esta pantalla?')) {
      setScreens({
        ...screens,
        [type]: screens[type].filter(s => s.id !== id)
      });
      addNotification('success', 'Pantalla eliminada correctamente');
    }
  };

  const handleLogin = (email, password) => {
    const user = users[email];
    if (user && user.password === password) {
      setCurrentUser({ ...user, email });
      setIsLoggedIn(true);
      addNotification('success', `Sesión iniciada como ${user.name}`);
    } else {
      addNotification('error', 'Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const addNotification = (type, message) => {
    const newNotification = {
      id: Date.now(),
      type,
      message,
      time: new Date(),
    };
    setNotifications([newNotification, ...notifications]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
    }, 5000);
  };

  const value = {
    isLoggedIn,
    currentUser,
    apiKeys,
    screens,
    mediaLibrary,
    backups,
    tickets,
    notifications,
    selectedScreen,
    handleLogin,
    handleLogout,
    setApiKeys,
    setScreens,
    setMediaLibrary,
    setBackups,
    setTickets,
    addNotification,
    users,
    createNewScreen,
    deleteScreen,
    setSelectedScreen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
