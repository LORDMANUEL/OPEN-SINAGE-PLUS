const { createApp } = require('./src/app');
const { XiboClient } = require('./src/xibo-client');

const port = Number(process.env.PORT || 3000);

function buildXiboClientFromEnv() {
  return new XiboClient({
    baseUrl: process.env.XIBO_BASE_URL,
    clientId: process.env.XIBO_CLIENT_ID,
    clientSecret: process.env.XIBO_CLIENT_SECRET,
    timeoutMs: Number(process.env.XIBO_TIMEOUT_MS || 10000),
  });
}

try {
  const app = createApp({ xiboClient: buildXiboClientFromEnv() });
  app.listen(port, () => {
    console.log(`Open Signage API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error(`Open Signage API configuration error: ${error.message}`);
  process.exitCode = 1;
}
