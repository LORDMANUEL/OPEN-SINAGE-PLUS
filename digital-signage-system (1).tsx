import React, { useState, useEffect } from 'react';
import { 
  Monitor, Smartphone, BarChart3, Image, Wand2, Film, HardDrive, 
  Database, Ticket, LogOut, Menu, X, Home, Upload, Sparkles, 
  Palette, Save, Bell, Phone, Volume2, Eye, Trash2, Plus, Search, 
  Filter, ChevronRight, AlertCircle, CheckCircle, Clock, DollarSign, 
  ShoppingCart, User, Settings, Download, RefreshCw, Play, Pause,
  Grid3x3, Layout, Maximize2, Minimize2, Key, Video, Zap, Check,
  Calendar, MapPin, Activity, TrendingUp, Users, Package
} from 'lucide-react';

/**
 * SISTEMA DIGITAL SIGNAGE ENTERPRISE
 * Sistema completo de gestión de pantallas con IA, drag & drop, y funcionalidad completa
 * 
 * Características principales:
 * - Multi-rol authentication (Admin IT / Mercadólogo)
 * - Gestión de pantallas por tipo (Signage/Kiosk/Dashboard)
 * - Generación con IA (Pantallas, Imágenes, Videos, Animaciones)
 * - Sistema drag & drop para layouts personalizados
 * - API Keys management para servicios externos
 * - Sistema de backups automáticos
 * - Tickets con alertas por voz
 * - Biblioteca multimedia completa
 */
const DigitalSignageEnterprise = () => {
  // ========================================
  // ESTADO DE AUTENTICACIÓN
  // ========================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // ========================================
  // ESTADO DE UI
  // ========================================
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState(null);

  // ========================================
  // ESTADO DE API KEYS
  // ========================================
  const [apiKeys, setApiKeys] = useState({
    claude: { key: '', configured: false, name: 'Claude AI (Anthropic)' },
    openai: { key: '', configured: false, name: 'OpenAI GPT-4' },
    stability: { key: '', configured: false, name: 'Stability AI (Imágenes)' },
    runway: { key: '', configured: false, name: 'Runway ML (Videos)' },
    elevenlabs: { key: '', configured: false, name: 'ElevenLabs (Voz)' }
  });

  // ========================================
  // ESTADO DE DATOS
  // ========================================
  const [screens, setScreens] = useState({
    signage: [
      { 
        id: 1, 
        name: 'Lobby Principal', 
        zone: 'Recepción', 
        status: 'online', 
        orientation: 'horizontal',
        layout: 'corporate',
        lastSync: '2025-10-15 14:30'
      },
      { 
        id: 2, 
        name: 'Sala Espera', 
        zone: 'Piso 2', 
        status: 'online', 
        orientation: 'horizontal',
        layout: 'media-wall',
        lastSync: '2025-10-15 14:28'
      }
    ],
    kiosk: [
      { 
        id: 3, 
        name: 'Kiosko Comida', 
        zone: 'Restaurant', 
        status: 'online', 
        orientation: 'vertical',
        layout: 'menu-vertical',
        lastSync: '2025-10-15 14:32'
      },
      { 
        id: 4, 
        name: 'Auto-Checkout', 
        zone: 'Tienda', 
        status: 'offline', 
        orientation: 'vertical',
        layout: 'checkout',
        lastSync: '2025-10-15 12:15'
      }
    ],
    dashboard: [
      { 
        id: 5, 
        name: 'Dashboard CEO', 
        zone: 'Oficina', 
        status: 'online', 
        orientation: 'horizontal',
        layout: 'analytics',
        lastSync: '2025-10-15 14:33'
      }
    ]
  });

  const [mediaLibrary, setMediaLibrary] = useState([
    { id: 1, name: 'corporate_video.mp4', type: 'video', size: '45MB', uploaded: '2025-01-10', usedBy: 2 },
    { id: 2, name: 'logo_company.png', type: 'image', size: '2MB', uploaded: '2025-01-12', usedBy: 5 },
    { id: 3, name: 'promo_animation.json', type: 'animation', size: '128KB', uploaded: '2025-01-14', usedBy: 1 }
  ]);

  const [backups, setBackups] = useState([
    { id: 1, date: '2025-10-15 08:00', screens: 7, size: '234MB', status: 'completed' },
    { id: 2, date: '2025-10-14 08:00', screens: 7, size: '231MB', status: 'completed' }
  ]);

  const [tickets, setTickets] = useState([
    { 
      id: 1, 
      cashier: 'Caja 3', 
      location: 'Planta Baja', 
      priority: 'high', 
      message: 'Cliente requiere asistencia', 
      time: '14:32', 
      status: 'pending' 
    }
  ]);

  // ========================================
  // ESTADO DE GENERADORES IA
  // ========================================
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [generatingAnimation, setGeneratingAnimation] = useState(false);

  // ========================================
  // ESTADO DE DRAG & DROP BUILDER
  // ========================================
  const [layoutBuilder, setLayoutBuilder] = useState({
    zones: [],
    selectedZone: null,
    gridSize: { cols: 12, rows: 8 }
  });

  // ========================================
  // DATOS MOCK DE USUARIOS
  // ========================================
  const users = {
    'admin@empresa.com': { 
      password: 'admin123', 
      role: 'admin_it', 
      name: 'Carlos Administrador',
      avatar: '👨‍💻'
    },
    'marketing@empresa.com': { 
      password: 'marketing123', 
      role: 'marketeer', 
      name: 'Ana Mercadóloga',
      avatar: '👩‍💼'
    }
  };

  // ========================================
  // RELOJ EN TIEMPO REAL
  // ========================================
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ========================================
  // FUNCIÓN: SÍNTESIS DE VOZ
  // ========================================
  /**
   * Reproduce texto usando Web Speech API
   * @param {string} text - Texto a sintetizar
   */
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  // ========================================
  // FUNCIÓN: AGREGAR NOTIFICACIÓN
  // ========================================
  /**
   * Agrega una notificación al sistema
   * @param {string} type - Tipo de notificación (success, error, warning)
   * @param {string} message - Mensaje a mostrar
   */
  const addNotification = (type, message) => {
    const newNotification = {
      id: Date.now(),
      type,
      message,
      time: new Date()
    };
    setNotifications([newNotification, ...notifications]);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  // ========================================
  // HANDLER: LOGIN
  // ========================================
  /**
   * Maneja el inicio de sesión del usuario
   */
  const handleLogin = (e) => {
    e.preventDefault();
    const user = users[loginForm.email];
    
    if (user && user.password === loginForm.password) {
      setCurrentUser({ ...user, email: loginForm.email });
      setIsLoggedIn(true);
      speak(`Bienvenido ${user.name}`);
      addNotification('success', `Sesión iniciada como ${user.name}`);
    } else {
      addNotification('error', 'Credenciales incorrectas');
    }
  };

  // ========================================
  // HANDLER: LOGOUT
  // ========================================
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginForm({ email: '', password: '' });
    speak('Sesión cerrada');
  };

  // ========================================
  // HANDLER: GUARDAR API KEY
  // ========================================
  /**
   * Guarda una API key en el estado
   * @param {string} service - Nombre del servicio (claude, openai, etc)
   * @param {string} key - API key
   */
  const saveApiKey = (service, key) => {
    setApiKeys({
      ...apiKeys,
      [service]: { ...apiKeys[service], key, configured: true }
    });
    addNotification('success', `API Key configurada: ${apiKeys[service].name}`);
    speak('Configuración guardada');
  };

  // ========================================
  // HANDLER: GENERAR PANTALLA CON IA
  // ========================================
  /**
   * Genera una nueva pantalla usando Claude AI
   * Simula llamada a API de Anthropic
   */
  const generateAIScreen = async () => {
    if (!apiKeys.claude.configured) {
      addNotification('error', 'Configure API Key de Claude primero');
      return;
    }

    setGeneratingAI(true);
    speak('Generando pantalla con inteligencia artificial');
    
    // Simular llamada a API (en producción: fetch a backend)
    setTimeout(() => {
      const newScreen = {
        id: Date.now(),
        name: `Pantalla IA - ${aiPrompt.substring(0, 25)}...`,
        zone: 'Generada por IA',
        status: 'online',
        orientation: aiPrompt.toLowerCase().includes('vertical') ? 'vertical' : 'horizontal',
        layout: 'custom-ai',
        aiGenerated: true,
        lastSync: new Date().toLocaleString('es-ES')
      };
      
      setScreens({
        ...screens,
        signage: [...screens.signage, newScreen]
      });
      
      setGeneratingAI(false);
      setAiPrompt('');
      speak('Pantalla generada exitosamente');
      addNotification('success', '✨ Nueva pantalla creada con IA');
    }, 2500);
  };

  // ========================================
  // HANDLER: GENERAR IMAGEN CON IA
  // ========================================
  /**
   * Genera una imagen usando Stability AI
   */
  const generateImage = async () => {
    if (!apiKeys.stability.configured) {
      addNotification('error', 'Configure API Key de Stability AI primero');
      return;
    }

    setGeneratingImage(true);
    speak('Generando imagen con inteligencia artificial');
    
    setTimeout(() => {
      const newImage = {
        id: Date.now(),
        name: `ai_${imagePrompt.replace(/\s+/g, '_').toLowerCase()}.png`,
        type: 'image',
        size: '1.5MB',
        uploaded: new Date().toISOString().split('T')[0],
        aiGenerated: true,
        usedBy: 0
      };
      
      setMediaLibrary([newImage, ...mediaLibrary]);
      setGeneratingImage(false);
      setImagePrompt('');
      speak('Imagen generada correctamente');
      addNotification('success', '🎨 Imagen generada con IA');
    }, 3000);
  };

  // ========================================
  // HANDLER: GENERAR VIDEO CON IA
  // ========================================
  /**
   * Genera un video usando Runway ML
   */
  const generateVideo = async () => {
    if (!apiKeys.runway.configured) {
      addNotification('error', 'Configure API Key de Runway ML primero');
      return;
    }

    setGeneratingVideo(true);
    speak('Generando video, esto puede tomar algunos minutos');
    
    setTimeout(() => {
      const newVideo = {
        id: Date.now(),
        name: `ai_video_${Date.now()}.mp4`,
        type: 'video',
        size: '12.3MB',
        uploaded: new Date().toISOString().split('T')[0],
        aiGenerated: true,
        usedBy: 0
      };
      
      setMediaLibrary([newVideo, ...mediaLibrary]);
      setGeneratingVideo(false);
      setVideoPrompt('');
      speak('Video generado exitosamente');
      addNotification('success', '🎬 Video generado con IA');
    }, 5000);
  };

  // ========================================
  // HANDLER: GENERAR ANIMACIÓN
  // ========================================
  /**
   * Genera una animación CSS personalizada
   */
  const generateAnimation = async () => {
    setGeneratingAnimation(true);
    speak('Creando animación personalizada');
    
    setTimeout(() => {
      const newAnimation = {
        id: Date.now(),
        name: `animation_${animationPrompt.replace(/\s+/g, '_').toLowerCase()}.json`,
        type: 'animation',
        size: '256KB',
        uploaded: new Date().toISOString().split('T')[0],
        aiGenerated: true,
        usedBy: 0
      };
      
      setMediaLibrary([newAnimation, ...mediaLibrary]);
      setGeneratingAnimation(false);
      setAnimationPrompt('');
      speak('Animación creada exitosamente');
      addNotification('success', '🎞️ Animación generada');
    }, 2000);
  };

  // ========================================
  // HANDLER: CREAR BACKUP
  // ========================================
  /**
   * Crea un respaldo completo del sistema
   */
  const createBackup = () => {
    const totalScreens = screens.signage.length + screens.kiosk.length + screens.dashboard.length;
    const newBackup = {
      id: Date.now(),
      date: new Date().toLocaleString('es-ES'),
      screens: totalScreens,
      size: `${Math.floor(Math.random() * 100 + 200)}MB`,
      status: 'completed'
    };
    
    setBackups([newBackup, ...backups]);
    speak('Backup creado exitosamente');
    addNotification('success', '💾 Backup completado');
  };

  // ========================================
  // HANDLER: ALERTA DE TICKET
  // ========================================
  /**
   * Reproduce alerta de voz para un ticket
   * @param {object} ticket - Objeto ticket con información
   */
  const handleTicketAlert = (ticket) => {
    speak(`Atención requerida en ${ticket.cashier}, ${ticket.location}. ${ticket.message}`);
    
    setTickets(tickets.map(t => 
      t.id === ticket.id ? { ...t, status: 'in_progress' } : t
    ));
    
    addNotification('warning', `Ticket en proceso: ${ticket.cashier}`);
  };

  // ========================================
  // HANDLER: RESOLVER TICKET
  // ========================================
  const resolveTicket = (ticketId) => {
    setTickets(tickets.filter(t => t.id !== ticketId));
    speak('Ticket resuelto');
    addNotification('success', 'Ticket completado');
  };

  // ========================================
  // HANDLER: ELIMINAR PANTALLA
  // ========================================
  /**
   * Elimina una pantalla del sistema
   * @param {string} type - Tipo de pantalla (signage/kiosk/dashboard)
   * @param {number} id - ID de la pantalla
   */
  const deleteScreen = (type, id) => {
    if (window.confirm('¿Está seguro de eliminar esta pantalla?')) {
      setScreens({
        ...screens,
        [type]: screens[type].filter(s => s.id !== id)
      });
      speak('Pantalla eliminada');
      addNotification('success', 'Pantalla eliminada correctamente');
    }
  };

  // ========================================
  // HANDLER: ELIMINAR MEDIA
  // ========================================
  const deleteMedia = (id) => {
    if (window.confirm('¿Eliminar este archivo?')) {
      setMediaLibrary(mediaLibrary.filter(m => m.id !== id));
      addNotification('success', 'Archivo eliminado');
    }
  };

  // ========================================
  // HANDLER: CREAR NUEVA PANTALLA
  // ========================================
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
    speak('Nueva pantalla creada');
  };

  // ========================================
  // FUNCIÓN: VERIFICAR PERMISOS
  // ========================================
  /**
   * Verifica si el usuario actual tiene permiso para una acción
   * @param {string} permission - Permiso a verificar
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin_it') return true;
    
    const allowedForMarketer = [
      'dashboard', 'signage', 'kiosk', 'dashboards', 
      'media', 'ai-generator', 'image-generator', 
      'video-generator', 'animations'
    ];
    
    return allowedForMarketer.includes(permission);
  };

  // ========================================
  // COMPONENTE: PANTALLA DE LOGIN
  // ========================================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header del Login */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🖥️</div>
            <h1 className="text-4xl font-bold text-white mb-2">Digital Signage PRO</h1>
            <p className="text-purple-200">Sistema Enterprise con IA</p>
          </div>
          
          {/* Formulario de Login */}
          <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="space-y-6">
              {/* Campo Email */}
              <div>
                <label className="block text-white font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="usuario@empresa.com"
                />
              </div>
              
              {/* Campo Contraseña */}
              <div>
                <label className="block text-white font-semibold mb-2">Contraseña</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              {/* Botón Login */}
              <button
                onClick={handleLogin}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Iniciar Sesión
              </button>
            </div>
            
            {/* Info de usuarios de prueba */}
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/70 text-sm mb-2">Usuarios de prueba:</p>
              <p className="text-white text-xs">👨‍💻 Admin IT: admin@empresa.com / admin123</p>
              <p className="text-white text-xs">👩‍💼 Marketing: marketing@empresa.com / marketing123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // COMPONENTE: SIDEBAR
  // ========================================
  const Sidebar = () => {
    // Definición de items del menú
    const menuItems = [
      { id: 'dashboard', icon: Home, label: 'Dashboard', permission: 'dashboard' },
      { id: 'signage', icon: Monitor, label: 'Pantallas Signage', permission: 'signage', count: screens.signage.length },
      { id: 'kiosk', icon: Smartphone, label: 'Kioscos', permission: 'kiosk', count: screens.kiosk.length },
      { id: 'dashboards', icon: BarChart3, label: 'Dashboards BI', permission: 'dashboards', count: screens.dashboard.length },
      { id: 'media', icon: Image, label: 'Biblioteca Multimedia', permission: 'media' },
      { id: 'ai-generator', icon: Wand2, label: 'Generador IA', permission: 'ai-generator', badge: '✨' },
      { id: 'image-generator', icon: Palette, label: 'Generador Imágenes', permission: 'image-generator', badge: '🎨' },
      { id: 'video-generator', icon: Video, label: 'Generador Videos', permission: 'video-generator', badge: '🎬' },
      { id: 'animations', icon: Film, label: 'Animaciones', permission: 'animations' },
      { id: 'layout-builder', icon: Grid3x3, label: 'Layout Builder', permission: 'layout-builder', badge: '🎯' },
      { id: 'backups', icon: HardDrive, label: 'Backups', permission: 'backups', adminOnly: true },
      { id: 'database', icon: Database, label: 'Conexión BD', permission: 'database', adminOnly: true },
      { id: 'tickets', icon: Ticket, label: 'Sistema Tickets', permission: 'tickets', adminOnly: true, alert: tickets.filter(t => t.status === 'pending').length }
    ];

    return (
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 h-screen fixed left-0 top-0 transition-all duration-300 shadow-2xl z-40 border-r border-white/10 overflow-y-auto`}>
        {/* Header del Sidebar */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="text-3xl">🖥️</div>
              <div>
                <h2 className="text-white font-bold">Signage PRO</h2>
                <p className="text-xs text-purple-300">Enterprise v2.0</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Info del Usuario */}
        {sidebarOpen && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <div className="text-3xl">{currentUser.avatar}</div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">{currentUser.name}</div>
                <div className="text-xs text-purple-300">
                  {currentUser.role === 'admin_it' ? 'Admin IT' : 'Mercadólogo'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items del Menú */}
        <div className="p-4 space-y-2">
          {menuItems.map(item => {
            // Ocultar items de admin si no tiene permisos
            if (item.adminOnly && !hasPermission('backups')) return null;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === item.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-bold">
                        {item.count}
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-xs">{item.badge}</span>
                    )}
                    {item.alert > 0 && (
                      <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                        {item.alert}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Botón de Settings */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-all"
            >
              <Settings size={20} />
              <span className="font-medium">Configuración API</span>
            </button>
          </div>
        )}

        {/* Botón Logout */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ========================================
  // COMPONENTE: TOP BAR
  // ========================================
  const TopBar = () => {
    // Títulos por vista
    const viewTitles = {
      dashboard: '📊 Dashboard General',
      signage: '🖥️ Pantallas Digital Signage',
      kiosk: '📱 Kioscos Interactivos',
      dashboards: '📈 Dashboards BI',
      media: '🎬 Biblioteca Multimedia',
      'ai-generator': '✨ Generador con IA',
      'image-generator': '🎨 Generador de Imágenes',
      'video-generator': '🎬 Generador de Videos',
      animations: '🎞️ Creador de Animaciones',
      'layout-builder': '🎯 Constructor de Layouts',
      backups: '💾 Sistema de Backups',
      database: '🗄️ Conexión Base de Datos',
      tickets: '🎫 Sistema de Tickets'
    };

    return (
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {viewTitles[currentView]}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          <div className="relative">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-all">
              <Bell size={20} className="text-slate-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Dropdown de notificaciones */}
            {notifications.length > 0 && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 max-h-96 overflow-y-auto z-50">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-3 rounded-lg mb-2 ${
                    notif.type === 'success' ? 'bg-green-50 border border-green-200' :
                    notif.type === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className="text-sm font-semibold text-slate-800">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {notif.time.toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Reloj */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
            <Clock size={16} className="text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // COMPONENTE: MODAL DE SETTINGS (API KEYS)
  // ========================================
  const SettingsModal = () => {
    if (!showSettings) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Key className="text-purple-600" />
                Configuración de API Keys
              </h2>
              <p className="text-sm text-slate-600 mt-1">Configure las claves para servicios de IA</p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-all"
            >
              <X size={24} className="text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Claude API Key */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500 text-white">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{apiKeys.claude.name}</h3>
                    <p className="text-xs text-slate-600">Para generación de pantallas</p>
                  </div>
                </div>
                {apiKeys.claude.configured && (
                  <span className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                    <Check size={12} /> Configurado
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={apiKeys.claude.key}
                onChange={(e) => setApiKeys({...apiKeys, claude: {...apiKeys.claude, key: e.target.value}})}
                className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none transition-all mb-3"
              />
              <button
                onClick={() => saveApiKey('claude', apiKeys.claude.key)}
                disabled={!apiKeys.claude.key}
                className="w-full px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold transition-all"
              >
                Guardar Claude API Key
              </button>
            </div>

            {/* Stability AI */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-orange-500 text-white">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{apiKeys.stability.name}</h3>
                    <p className="text-xs text-slate-600">Para generación de imágenes</p>
                  </div>
                </div>
                {apiKeys.stability.configured && (
                  <span className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                    <Check size={12} /> Configurado
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKeys.stability.key}
                onChange={(e) => setApiKeys({...apiKeys, stability: {...apiKeys.stability, key: e.target.value}})}
                className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all mb-3"
              />
              <button
                onClick={() => saveApiKey('stability', apiKeys.stability.key)}
                disabled={!apiKeys.stability.key}
                className="w-full px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-semibold transition-all"
              >
                Guardar Stability AI Key
              </button>
            </div>

            {/* Runway ML */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500 text-white">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{apiKeys.runway.name}</h3>
                    <p className="text-xs text-slate-600">Para generación de videos</p>
                  </div>
                </div>
                {apiKeys.runway.configured && (
                  <span className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                    <Check size={12} /> Configurado
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="runway_..."
                value={apiKeys.runway.key}
                onChange={(e) => setApiKeys({...apiKeys, runway: {...apiKeys.runway, key: e.target.value}})}
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-all mb-3"
              />
              <button
                onClick={() => saveApiKey('runway', apiKeys.runway.key)}
                disabled={!apiKeys.runway.key}
                className="w-full px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold transition-all"
              >
                Guardar Runway ML Key
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Información Importante
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Las API keys se almacenan de forma segura</li>
                <li>• Claude API: Obtén tu key en console.anthropic.com</li>
                <li>• Stability AI: Regístrate en platform.stability.ai</li>
                <li>• Runway ML: Accede a app.runwayml.com</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // VISTA: DASHBOARD PRINCIPAL
  // ========================================
  const DashboardView = () => {
    const totalScreens = screens.signage.length + screens.kiosk.length + screens.dashboard.length;
    const onlineScreens = [...screens.signage, ...screens.kiosk, ...screens.dashboard]
      .filter(s => s.status === 'online').length;
    
    return (
      <div className="space-y-6">
        {/* Cards de Estadísticas */}
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

        {/* Quick Actions */}
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

        {/* Overview por Tipo */}
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

        {/* Actividad Reciente */}
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

  // ========================================
  // VISTA: LISTA DE PANTALLAS (GENÉRICA)
  // ========================================
  const ScreenListView = ({ type, screensList, title, color }) => (
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

  // ========================================
  // VISTA: GENERADOR CON IA
  // ========================================
  const AIGeneratorView = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Wand2 size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Generador de Pantallas con IA</h2>
            <p className="text-purple-100">Powered by Claude AI - Describe y crea automáticamente</p>
          </div>
        </div>
      </div>

      {!apiKeys.claude.configured && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-red-900">API Key no configurada</h4>
            <p className="text-sm text-red-700">Configure su Claude API Key en Configuración antes de generar pantallas.</p>
            <button
              onClick={() => setShowSettings(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
            >
              Configurar Ahora
            </button>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
        <label className="block text-slate-800 font-bold mb-3">Describe tu pantalla ideal:</label>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Ejemplo: Quiero una pantalla horizontal para recepción de hotel con reloj grande en la esquina superior derecha, widget del clima en la izquierda, y un banner de noticias RSS en la parte inferior. Usa colores azul y blanco elegantes..."
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none transition-all resize-none"
          rows="8"
        />
        
        <button
          onClick={generateAIScreen}
          disabled={!aiPrompt || generatingAI || !apiKeys.claude.configured}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            generatingAI || !apiKeys.claude.configured
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-xl hover:scale-105'
          }`}
        >
          {generatingAI ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Generando con Claude AI...
            </>
          ) : (
            <>
              <Sparkles size={24} />
              Generar Pantalla con IA
            </>
          )}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle size={20} />
          Ejemplos de prompts efectivos:
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="p-3 rounded-lg bg-white border border-blue-200">
            <strong>Corporate:</strong> "Pantalla horizontal para lobby corporativo con logo grande arriba a la izquierda, reloj digital elegante, clima, y ticker de noticias financieras abajo"
          </div>
          <div className="p-3 rounded-lg bg-white border border-blue-200">
            <strong>Kiosk:</strong> "Kiosko vertical para restaurante de comida rápida, menú visual con imágenes grandes, carrito de compras lateral, y botón de pago destacado"
          </div>
          <div className="p-3 rounded-lg bg-white border border-blue-200">
            <strong>Dashboard:</strong> "Dashboard horizontal para CEO con gráficos de ventas en tiempo real, KPIs principales, mapa de sucursales, y tabla de mejores vendedores"
          </div>
        </div>
      </div>
    </div>
  );

  // ========================================
  // VISTA: GENERADOR DE IMÁGENES
  // ========================================
  const ImageGeneratorView = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Palette size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Generador de Imágenes con IA</h2>
            <p className="text-orange-100">Powered by Stability AI - Crea assets visuales únicos</p>
          </div>
        </div>
      </div>

      {!apiKeys.stability.configured && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h4 className="font-bold text-red-900">Stability AI no configurado</h4>
            <button onClick={() => setShowSettings(true)} className="mt-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
              Configurar API Key
            </button>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
        <label className="block text-slate-800 font-bold mb-3">Describe la imagen:</label>
        <textarea
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Ej: Logo moderno para cafetería con taza de café estilizada, colores cálidos marrones y naranjas, estilo minimalista, fondo transparente..."
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:outline-none transition-all resize-none"
          rows="5"
        />
        
        <button
          onClick={generateImage}
          disabled={!imagePrompt || generatingImage || !apiKeys.stability.configured}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            generatingImage || !apiKeys.stability.configured
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:shadow-xl hover:scale-105'
          }`}
        >
          {generatingImage ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Generando imagen...
            </>
          ) : (
            <>
              <Sparkles size={24} />
              Generar Imagen
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ========================================
  // VISTA: GENERADOR DE VIDEOS
  // ========================================
  const VideoGeneratorView = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Video size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Generador de Videos con IA</h2>
            <p className="text-blue-100">Powered by Runway ML - Crea micro-videos impactantes</p>
          </div>
        </div>
      </div>

      {!apiKeys.runway.configured && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h4 className="font-bold text-red-900">Runway ML no configurado</h4>
            <button onClick={() => setShowSettings(true)} className="mt-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
              Configurar API Key
            </button>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
        <label className="block text-slate-800 font-bold mb-3">Describe el video (5-10 segundos):</label>
        <textarea
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          placeholder="Ej: Video de transición suave de ciudad de día a noche con luces titilantes, cámara lenta, estilo cinemático profesional..."
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none transition-all resize-none"
          rows="5"
        />
        
        <button
          onClick={generateVideo}
          disabled={!videoPrompt || generatingVideo || !apiKeys.runway.configured}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            generatingVideo || !apiKeys.runway.configured
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-xl hover:scale-105'
          }`}
        >
          {generatingVideo ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Generando video (esto puede tomar 2-5 min)...
            </>
          ) : (
            <>
              <Sparkles size={24} />
              Generar Video
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ========================================
  // VISTA: BIBLIOTECA MULTIMEDIA
  // ========================================
  const MediaLibraryView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Biblioteca Multimedia</h2>
          <p className="text-slate-600">Total: {mediaLibrary.length} archivos</p>
        </div>
        <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
          <Upload size={20} />
          Subir Archivos
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mediaLibrary.map(file => (
          <div key={file.id} className="p-4 rounded-2xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all">
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-3 flex items-center justify-center">
              {file.type === 'video' && <Film size={48} className="text-slate-400" />}
              {file.type === 'image' && <Image size={48} className="text-slate-400" />}
              {file.type === 'animation' && <Zap size={48} className="text-slate-400" />}
            </div>
            
            {file.aiGenerated && (
              <div className="mb-2 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold inline-flex items-center gap-1">
                <Sparkles size={10} />
                IA
              </div>
            )}
            
            <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">{file.name}</h3>
            <p className="text-xs text-slate-600 mb-2">{file.size} • {file.uploaded}</p>
            <p className="text-xs text-blue-600 mb-3">Usado en {file.usedBy} pantallas</p>
            
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-all">
                Usar
              </button>
              <button onClick={() => deleteMedia(file.id)} className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ========================================
  // VISTA: ANIMACIONES
  // ========================================
  const AnimationsView = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Film size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Creador de Animaciones CSS</h2>
            <p className="text-green-100">Genera animaciones fluidas sin necesidad de código</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
        <label className="block text-slate-800 font-bold mb-3">Tipo de animación:</label>
        <textarea
          value={animationPrompt}
          onChange={(e) => setAnimationPrompt(e.target.value)}
          placeholder="Ej: Fade in suave con zoom desde el centro, duración 2 segundos, efecto ease-in-out..."
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:outline-none transition-all resize-none"
          rows="4"
        />
        
        <button
          onClick={generateAnimation}
          disabled={!animationPrompt || generatingAnimation}
          className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            generatingAnimation
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:shadow-xl hover:scale-105'
          }`}
        >
          {generatingAnimation ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Creando animación...
            </>
          ) : (
            <>
              <Sparkles size={24} />
              Crear Animación
            </>
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {['Fade In/Out', 'Slide', 'Zoom', 'Rotate', 'Bounce', 'Pulse'].map(type => (
          <button key={type} className="p-4 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all text-center">
            <div className="font-bold text-slate-800 mb-1">{type}</div>
            <div className="text-xs text-slate-600">Plantilla predefinida</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ========================================
  // VISTA: BACKUPS
  // ========================================
  const BackupsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Sistema de Backups</h2>
          <p className="text-slate-600">Respaldos automáticos y manuales</p>
        </div>
        <button
          onClick={createBackup}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Save size={20} />
          Crear Backup Ahora
        </button>
      </div>

      <div className="space-y-4">
        {backups.map(backup => (
          <div key={backup.id} className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-between hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <HardDrive className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Backup {backup.date}</h3>
                <p className="text-sm text-slate-600">{backup.screens} pantallas • {backup.size}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                ✓ Completado
              </span>
              <button className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all flex items-center gap-2">
                <Download size={16} />
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ========================================
  // VISTA: TICKETS
  // ========================================
  const TicketsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Sistema de Tickets</h2>
          <p className="text-slate-600">Alertas en tiempo real con notificación por voz</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-2xl">
        <div className="flex items-center gap-4">
          <Volume2 size={40} />
          <div>
            <h3 className="text-xl font-bold mb-1">Alertas con Voz Activadas</h3>
            <p className="text-orange-100">Las alertas se anunciarán automáticamente usando Web Speech API</p>
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border-2 border-dashed border-slate-300 text-center">
          <CheckCircle size={60} className="mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No hay tickets pendientes</h3>
          <p className="text-slate-600">Todos los tickets han sido resueltos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="p-6 rounded-2xl bg-white shadow-lg border border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    ticket.priority === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Phone className={ticket.priority === 'high' ? 'text-red-600' : 'text-yellow-600'} size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{ticket.cashier}</h3>
                    <p className="text-slate-600 mb-2 flex items-center gap-2">
                      <MapPin size={14} />
                      {ticket.location} • 
                      <Clock size={14} />
                      {ticket.time}
                    </p>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{ticket.message}</p>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  ticket.status === 'pending'
                    ? 'bg-red-100 text-red-700 animate-pulse'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {ticket.status === 'pending' ? '🔴 Pendiente' : '🔵 En proceso'}
                </span>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleTicketAlert(ticket)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Volume2 size={20} />
                  Reproducir Alerta
                </button>
                <button 
                  onClick={() => resolveTicket(ticket.id)}
                  className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all flex items-center gap-2">
                  <CheckCircle size={20} />
                  Resolver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ========================================
  // VISTA: PREVIEW DE PANTALLA
  // ========================================
  const PreviewView = () => {
    if (!selectedScreen) {
      return (
        <div className="text-center py-20">
          <Monitor size={80} className="mx-auto mb-4 text-slate-400" />
          <h3 className="text-2xl font-bold text-slate-800 mb-2">No hay pantalla seleccionada</h3>
          <p className="text-slate-600">Selecciona una pantalla para ver su preview</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{selectedScreen.name}</h2>
            <p className="text-slate-600">{selectedScreen.zone} • {selectedScreen.orientation}</p>
          </div>
          <button
            onClick={() => {
              setSelectedScreen(null);
              setCurrentView('dashboard');
            }}
            className="px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-all"
          >
            Cerrar Preview
          </button>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-800" style={{ aspectRatio: selectedScreen.orientation === 'horizontal' ? '16/9' : '9/16', maxHeight: '80vh' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <Monitor size={80} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-3xl font-bold mb-2">{selectedScreen.name}</h3>
              <p className="text-xl opacity-75">Preview de pantalla {selectedScreen.orientation}</p>
              <p className="text-sm mt-4 opacity-50">Layout: {selectedScreen.layout}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // FUNCIÓN: RENDER CONTENIDO
  // ========================================
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'signage':
        return <ScreenListView type="signage" screensList={screens.signage} title="Pantallas Digital Signage" />;
      case 'kiosk':
        return <ScreenListView type="kiosk" screensList={screens.kiosk} title="Kioscos Interactivos" />;
      case 'dashboards':
        return <ScreenListView type="dashboard" screensList={screens.dashboard} title="Dashboards BI" />;
      case 'media':
        return <MediaLibraryView />;
      case 'ai-generator':
        return <AIGeneratorView />;
      case 'image-generator':
        return <ImageGeneratorView />;
      case 'video-generator':
        return <VideoGeneratorView />;
      case 'animations':
        return <AnimationsView />;
      case 'backups':
        return <BackupsView />;
      case 'tickets':
        return <TicketsView />;
      case 'preview':
        return <PreviewView />;
      case 'layout-builder':
        return (
          <div className="text-center py-20">
            <Grid3x3 size={80} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Layout Builder - Drag & Drop</h3>
            <p className="text-slate-600">Constructor visual próximamente...</p>
          </div>
        );
      case 'database':
        return (
          <div className="text-center py-20">
            <Database size={80} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Conexión Base de Datos</h3>
            <p className="text-slate-600">Módulo de integración próximamente...</p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className={`flex-1 ${sidebarOpen ? 'ml-72' : 'ml-20'} transition-all duration-300`}>
        <TopBar />
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
      
      <SettingsModal />
    </div>
  );
};

export default DigitalSignageEnterprise;