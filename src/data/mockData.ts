export const initialApiKeys = {
  claude: { key: '', configured: false, name: 'Claude AI (Anthropic)' },
  openai: { key: '', configured: false, name: 'OpenAI GPT-4' },
  stability: { key: '', configured: false, name: 'Stability AI (Imágenes)' },
  runway: { key: '', configured: false, name: 'Runway ML (Videos)' },
  elevenlabs: { key: '', configured: false, name: 'ElevenLabs (Voz)' }
};

export const initialScreens = {
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
};

export const initialMediaLibrary = [
  { id: 1, name: 'corporate_video.mp4', type: 'video', size: '45MB', uploaded: '2025-01-10', usedBy: 2 },
  { id: 2, name: 'logo_company.png', type: 'image', size: '2MB', uploaded: '2025-01-12', usedBy: 5 },
  { id: 3, name: 'promo_animation.json', type: 'animation', size: '128KB', uploaded: '2025-01-14', usedBy: 1 }
];

export const initialBackups = [
  { id: 1, date: '2025-10-15 08:00', screens: 7, size: '234MB', status: 'completed' },
  { id: 2, date: '2025-10-14 08:00', screens: 7, size: '231MB', status: 'completed' }
];

export const initialTickets = [
  {
    id: 1,
    cashier: 'Caja 3',
    location: 'Planta Baja',
    priority: 'high',
    message: 'Cliente requiere asistencia',
    time: '14:32',
    status: 'pending'
  }
];

export const users = {
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
