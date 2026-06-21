const express = require('express');
const app = express();

const logs = [];
let latestLatency = 0;

function addLog(message) {
  logs.push({ timestamp: new Date().toISOString(), message });
  if (logs.length > 100) logs.shift();
}

function updateLatency(latency) {
  latestLatency = latency;
}

app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Slack Bot Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .log-entry { margin-bottom: 5px; font-family: monospace; }
          .latency { font-size: 1.2em; font-weight: bold; color: green; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Slack Bot Live Dashboard</h1>
        <div class="latency">Latest Groq API Latency: ${latestLatency} ms</div>
        <h2>System Logs</h2>
        <div class="logs">
          ${logs.reverse().map(l => `<div class="log-entry">[${l.timestamp}] ${l.message}</div>`).join('')}
        </div>
        <script>
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
    </html>
  `;
  res.send(html);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    app.listen(port, () => {
      console.log(`Dashboard listening on port ${port}`);
      resolve();
    }).on('error', reject);
  });
}

module.exports = {
  startServer,
  addLog,
  updateLatency,
  app
};
