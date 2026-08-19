const { createApp } = require('./src/app');
const { createXiboIntegrationFromEnv } = require('./src/xibo-integration');

const port = Number(process.env.PORT || 3000);
const app = createApp({ xiboClient: createXiboIntegrationFromEnv(process.env) });

app.listen(port, () => {
  console.log(`Open Signage API listening on http://localhost:${port}`);
});
