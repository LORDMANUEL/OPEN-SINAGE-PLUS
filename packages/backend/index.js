const { createApp } = require('./src/app');
const { createXiboIntegrationFromEnv } = require('./src/xibo-integration');
const { SceneStore } = require('./src/scene-store');

const port = Number(process.env.PORT || 3000);
const app = createApp({
  xiboClient: createXiboIntegrationFromEnv(process.env),
  sceneStore: new SceneStore({ dataDir: process.env.OPEN_SIGNAGE_DATA_DIR || '/data' }),
});

app.listen(port, () => {
  console.log(`Open Signage API listening on http://localhost:${port}`);
});
