const express = require('express');
const path = require('path');
const app = express();

const logs = [];
let latestLatency = 0;
const latencyHistory = [];

const commandStats = {
  '/slacky-wacky-ask': { count: 0, lastUsed: 'Never', desc: 'Ask the Groq AI a question with history support' },
  '/slacky-wacky-joke': { count: 0, lastUsed: 'Never', desc: 'Get a developer/coding joke from Groq' },
  '/slacky-wacky-fact': { count: 0, lastUsed: 'Never', desc: 'Get a mind-blowing random fun fact' },
  '/slacky-wacky-define': { count: 0, lastUsed: 'Never', desc: 'Lookup a word and get a concise definition' },
  '/slacky-wacky-status': { count: 0, lastUsed: 'Never', desc: 'Check if the bot server is online' },
  '/slacky-wacky-help': { count: 0, lastUsed: 'Never', desc: 'Display a summary of all commands' },
};

function addLog(message) {
  logs.push({ timestamp: new Date().toISOString(), message });
  if (logs.length > 100) logs.shift();
}

function updateLatency(latency) {
  latestLatency = latency;
  latencyHistory.push(latency);
  if (latencyHistory.length > 20) latencyHistory.shift();
}

function trackCommand(commandName) {
  if (commandStats[commandName]) {
    commandStats[commandName].count++;
    commandStats[commandName].lastUsed = new Date().toLocaleTimeString();
    addLog(`Command triggered: ${commandName}`);
  }
}

// Format Uptime helper
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  
  const dDisplay = d > 0 ? `${d}d ` : "";
  const hDisplay = h > 0 ? `${h}h ` : "";
  const mDisplay = m > 0 ? `${m}m ` : "";
  const sDisplay = `${s}s`;
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

// Get SQLite message count dynamically
let db = null;
try {
  db = require('./db');
} catch (err) {
  console.error("Could not load db module inside server.js:", err);
}

app.get('/api/status', (req, res) => {
  let sqliteCount = 0;
  let sqliteHealth = "Healthy";
  if (db && typeof db.getMessageCount === 'function') {
    try {
      sqliteCount = db.getMessageCount();
    } catch (e) {
      sqliteHealth = "Error";
    }
  } else {
    sqliteHealth = "Unavailable";
  }

  res.json({
    status: 'online',
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime()),
    latestLatency,
    latencyHistory,
    sqliteCount,
    sqliteHealth,
    commandStats,
    logs: [...logs].reverse()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/dashboard', (req, res) => {
  res.redirect('/');
});

app.get('/', (req, res) => {
  let sqliteCount = 0;
  if (db && typeof db.getMessageCount === 'function') {
    try {
      sqliteCount = db.getMessageCount();
    } catch (e) {
      // Ignored
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>slacky-wacky</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f9f9f6;
      --card-bg: #ffffff;
      --border: #e6e5e0;
      --text: #1c1917;
      --text-muted: #78716c;
      --green: #16a34a;
      --indigo: #4f46e5;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background: radial-gradient(circle at 15% 15%, rgba(79, 70, 229, 0.04), transparent 45%), radial-gradient(circle at 85% 85%, rgba(192, 132, 252, 0.04), transparent 45%), var(--bg);
      font-family: 'Inter', sans-serif;
      color: var(--text);
      line-height: 1.5;
      padding: 3rem 1.5rem;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--green);
      border-radius: 50%;
    }
    
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      margin-top: 2rem;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    
    .card-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    
    .card-value {
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
    }
    
    .commands-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }
    
    .commands-table th, .commands-table td {
      text-align: left;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    
    .commands-table th {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }
    
    .commands-table td code {
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
      color: var(--indigo);
      background: rgba(79, 70, 229, 0.05);
      padding: 0.15rem 0.35rem;
      border-radius: 6px;
    }
    
    .logs-container {
      background: #18181b;
      color: #f4f4f5;
      font-family: 'Fira Code', monospace;
      font-size: 0.8125rem;
      padding: 1.25rem;
      border-radius: 12px;
      height: 200px;
      overflow-y: auto;
      border: 1px solid #27272a;
      white-space: pre-wrap;
    }
    
    .log-entry {
      margin-bottom: 0.25rem;
      border-bottom: 1px solid #27272a;
      padding-bottom: 0.25rem;
    }
    
    .log-entry:last-child {
      border-bottom: none;
    }
    
    .log-time {
      color: #71717a;
      margin-right: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <span class="brand-title">slacky-wacky</span>
      </div>
      <div class="status">
        <span class="status-dot"></span>
        <span>Online</span>
      </div>
    </header>
    
    <main>
      <h2>Metrics</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">API Latency</div>
          <div class="card-value" id="latency">--</div>
        </div>
        <div class="card">
          <div class="card-label">Uptime</div>
          <div class="card-value" id="uptime">--</div>
        </div>
        <div class="card">
          <div class="card-label">Database Logs</div>
          <div class="card-value" id="db-count">${sqliteCount} messages</div>
        </div>
      </div>
      
      <h2>Slash Commands</h2>
      <table class="commands-table">
        <thead>
          <tr>
            <th>Command</th>
            <th>Description</th>
            <th>Uses</th>
            <th>Last Used</th>
          </tr>
        </thead>
        <tbody id="commands-body">
          <!-- Populated dynamically -->
        </tbody>
      </table>
      
      <h2>System Logs</h2>
      <div class="logs-container" id="logs">
        <!-- Populated dynamically -->
      </div>
    </main>
  </div>
  
  <script>
    async function updateStats() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('latency').textContent = data.latestLatency + ' ms';
        document.getElementById('uptime').textContent = data.uptimeFormatted;
        document.getElementById('db-count').textContent = data.sqliteCount + ' messages';
        
        const tbody = document.getElementById('commands-body');
        tbody.innerHTML = '';
        for (const [cmd, stats] of Object.entries(data.commandStats)) {
          const tr = document.createElement('tr');
          tr.innerHTML = \`
            <td><code>\${cmd}</code></td>
            <td style="font-size: 0.875rem; color: var(--text-muted); font-weight: 400;">\${stats.desc}</td>
            <td>\${stats.count}</td>
            <td style="color: var(--text-muted); font-size: 0.875rem;">\${stats.lastUsed}</td>
          \`;
          tbody.appendChild(tr);
        }
        
        const logsDiv = document.getElementById('logs');
        logsDiv.innerHTML = '';
        data.logs.forEach(log => {
          const div = document.createElement('div');
          div.className = 'log-entry';
          div.innerHTML = \`<span class="log-time">\${new Date(log.timestamp).toLocaleTimeString()}</span>\${log.message}\`;
          logsDiv.appendChild(div);
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }
    
    setInterval(updateStats, 2500);
    updateStats();
  </script>
</body>
</html>
  `;
  res.send(html);
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
  trackCommand,
  app
};
