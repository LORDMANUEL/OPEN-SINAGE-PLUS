const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const screens = {
  signage: [
    {
      id: 1,
      name: 'Lobby Principal (Modificado)',
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

app.get('/api/screens', (req, res) => {
  res.json(screens);
});

app.listen(port, () => {
  console.log(`Mock API server listening at http://localhost:${port}`);
});
