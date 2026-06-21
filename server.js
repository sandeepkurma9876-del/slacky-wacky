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

app.get('/', (req, res) => {
  let sqliteCount = 0;
  let sqliteHealth = "Healthy";
  if (db && typeof db.getMessageCount === 'function') {
    try {
      sqliteCount = db.getMessageCount();
    } catch (e) {
      sqliteHealth = "Error";
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slack Bot Live Dashboard - slacky-wacky</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #080b11;
      --card-bg: rgba(15, 23, 42, 0.45);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-highlight: rgba(255, 255, 255, 0.15);
      
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      
      --primary: #818cf8; /* indigo */
      --secondary: #c084fc; /* purple */
      --cyan: #38bdf8; /* cyan */
      
      --green: #34d399;
      --red: #f87171;
      --orange: #fb923c;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg-color);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(192, 132, 252, 0.12) 0%, transparent 40%);
      background-attachment: fixed;
      font-family: 'Inter', sans-serif;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    
    h1, h2, h3, .brand-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
    }
    
    .container {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      flex: 1;
    }
    
    header {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      color: #fff;
      font-size: 1.3rem;
      box-shadow: 0 0 15px rgba(129, 140, 248, 0.35);
    }
    
    .brand-title {
      font-size: 1.35rem;
      background: linear-gradient(to right, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.2);
      color: var(--green);
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--green);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--green);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(52, 211, 153, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(52, 211, 153, 0);
      }
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .glass-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .glass-card:hover {
      border-color: var(--card-highlight);
      box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    
    .card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .card-title-icon {
      font-size: 1.2rem;
    }
    
    .metric-card {
      grid-column: span 3;
    }
    
    @media (max-width: 1024px) {
      .metric-card {
        grid-column: span 6;
      }
    }
    @media (max-width: 640px) {
      .metric-card {
        grid-column: span 12;
      }
    }
    
    .metric-value {
      font-family: 'Outfit', sans-serif;
      font-size: 1.85rem;
      font-weight: 700;
      margin-top: 0.5rem;
      background: linear-gradient(135deg, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .metric-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    
    .latency-graph-card {
      grid-column: span 8;
    }
    
    .system-status-card {
      grid-column: span 4;
    }
    
    @media (max-width: 1024px) {
      .latency-graph-card, .system-status-card {
        grid-column: span 12;
      }
    }
    
    .graph-container {
      width: 100%;
      height: 120px;
      margin-top: 1rem;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding-bottom: 5px;
      border-bottom: 1px dashed rgba(255,255,255,0.08);
    }
    
    .graph-bar {
      flex: 1;
      background: linear-gradient(to top, var(--primary), var(--cyan));
      border-radius: 4px 4px 0 0;
      transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      min-height: 4px;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    }
    
    .graph-bar:hover {
      filter: brightness(1.25);
    }
    
    .graph-bar-tooltip {
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%) scale(0.8);
      background: #0f172a;
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      opacity: 0;
      transition: all 0.2s ease;
      pointer-events: none;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .graph-bar:hover .graph-bar-tooltip {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    
    .status-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    
    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    
    .status-item:last-child {
      border-bottom: none;
    }
    
    .status-label {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .status-val {
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    
    .indicator-pill {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
    }
    
    .pill-green {
      background: rgba(52, 211, 153, 0.12);
      color: var(--green);
      border: 1px solid rgba(52, 211, 153, 0.2);
    }
    
    .pill-purple {
      background: rgba(192, 132, 252, 0.12);
      color: var(--secondary);
      border: 1px solid rgba(192, 132, 252, 0.2);
    }
    
    .commands-card {
      grid-column: span 12;
    }
    
    .commands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }
    
    .command-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.2s ease;
    }
    
    .command-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(129, 140, 248, 0.2);
      transform: translateY(-2px);
    }
    
    .command-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    
    .command-name {
      font-family: 'Fira Code', monospace;
      color: var(--cyan);
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.08);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }
    
    .command-count {
      font-family: 'Outfit', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-main);
    }
    
    .command-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      min-height: 2.2rem;
      line-height: 1.4;
    }
    
    .command-meta {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.35);
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.03);
      padding-top: 0.5rem;
    }
    
    .logs-card {
      grid-column: span 12;
    }
    
    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .logs-controls {
      display: flex;
      gap: 0.5rem;
    }
    
    .btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }
    
    .btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }
    
    .logs-console {
      background: #040711;
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 1.25rem;
      height: 280px;
      overflow-y: auto;
      font-family: 'Fira Code', monospace;
      font-size: 0.78rem;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.6);
    }
    
    .log-line {
      display: flex;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      padding-bottom: 0.25rem;
    }
    
    .log-time {
      color: var(--primary);
      flex-shrink: 0;
      opacity: 0.85;
    }
    
    .log-msg {
      color: #cbd5e1;
      word-break: break-all;
    }
    
    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .pulse-indicator {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    
    .pulse-indicator span {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--cyan);
      box-shadow: 0 0 8px var(--cyan);
      animation: pulse 1.5s infinite;
    }
    
    footer {
      text-align: center;
      padding: 2rem 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--card-border);
      margin-top: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-logo">SW</div>
        <h1 class="brand-title">Slack Bot Live Dashboard</h1>
      </div>
      <div class="header-controls">
        <div class="pulse-indicator"><span></span> Live Monitoring</div>
        <div class="status-badge">
          <div class="status-dot"></div>
          <span>Active</span>
        </div>
      </div>
    </header>

    <div class="dashboard-grid">
      <!-- Metric Cards -->
      <div class="glass-card metric-card">
        <div class="card-title">
          <span>API Latency</span>
          <span class="card-title-icon">⚡</span>
        </div>
        <div class="metric-value" id="latest-latency">${latestLatency} ms</div>
        <div class="metric-subtitle">Latest Groq API response time</div>
      </div>

      <div class="glass-card metric-card">
        <div class="card-title">
          <span>SQLite Messages</span>
          <span class="card-title-icon">🗄️</span>
        </div>
        <div class="metric-value" id="sqlite-count">${sqliteCount}</div>
        <div class="metric-subtitle">Total stored chat records</div>
      </div>

      <div class="glass-card metric-card">
        <div class="card-title">
          <span>Active Uptime</span>
          <span class="card-title-icon">⏱️</span>
        </div>
        <div class="metric-value" style="font-size: 1.55rem; padding-top: 0.2rem;" id="uptime-formatted">Calculating...</div>
        <div class="metric-subtitle">Continuous daemon execution</div>
      </div>

      <div class="glass-card metric-card">
        <div class="card-title">
          <span>SQLite Health</span>
          <span class="card-title-icon">🩺</span>
        </div>
        <div class="metric-value" id="sqlite-health">${sqliteHealth}</div>
        <div class="metric-subtitle">Database status & integrity</div>
      </div>

      <!-- Graph Container -->
      <div class="glass-card latency-graph-card">
        <div class="card-title">
          <span>Latency Track Record</span>
          <span class="card-title-icon" style="color: var(--cyan)">📈</span>
        </div>
        <div class="graph-container" id="graph-container">
          <!-- Populated by JavaScript -->
        </div>
      </div>

      <!-- Environment and System Status -->
      <div class="glass-card system-status-card">
        <div class="card-title">
          <span>Core System Health</span>
          <span class="card-title-icon">⚙️</span>
        </div>
        <div class="status-list">
          <div class="status-item">
            <span class="status-label">Socket Mode</span>
            <span class="status-val"><span class="indicator-pill pill-green">Enabled</span></span>
          </div>
          <div class="status-item">
            <span class="status-label">Groq Model IP</span>
            <span class="status-val"><span class="indicator-pill pill-purple">llama-3.3-70b</span></span>
          </div>
          <div class="status-item">
            <span class="status-label">SQLite Engine</span>
            <span class="status-val" style="font-family: monospace; font-size: 0.8rem;">better-sqlite3</span>
          </div>
        </div>
      </div>

      <!-- Commands Grid -->
      <div class="glass-card commands-card">
        <div class="card-title">
          <span>Available Slash Commands</span>
          <span class="card-title-icon">⌨️</span>
        </div>
        <div class="commands-grid" id="commands-grid">
          <!-- Populated by JavaScript -->
        </div>
      </div>

      <!-- Log Terminal -->
      <div class="glass-card logs-card">
        <div class="logs-header">
          <div class="card-title" style="margin-bottom: 0;">
            <span>System Daemon Logs</span>
          </div>
          <div class="logs-controls">
            <button class="btn" onclick="clearLogsUI()">Clear View</button>
          </div>
        </div>
        <div class="logs-console" id="logs-console">
          <!-- Populated by JavaScript -->
        </div>
      </div>
    </div>
  </div>

  <footer>
    <p>slacky-wacky dashboard &bull; premium administration console</p>
  </footer>

  <script>
    let autoscroll = true;

    function formatTime(isoString) {
      try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      } catch (e) {
        return isoString;
      }
    }

    function renderLatencyGraph(history) {
      const container = document.getElementById('graph-container');
      container.innerHTML = '';
      if (!history || history.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); width: 100%; text-align: center; line-height: 100px; font-size: 0.85rem;">No latency records collected yet. Trigger some commands!</div>';
        return;
      }

      const maxVal = Math.max(...history, 500); // set minimum scale of 500ms
      history.forEach((lat, index) => {
        const heightPercent = Math.min((lat / maxVal) * 100, 100);
        const bar = document.createElement('div');
        bar.className = 'graph-bar';
        bar.style.height = heightPercent + '%';
        
        const tooltip = document.createElement('div');
        tooltip.className = 'graph-bar-tooltip';
        tooltip.innerText = '#' + (index + 1) + ': ' + lat + ' ms';
        
        bar.appendChild(tooltip);
        container.appendChild(bar);
      });
    }

    function renderCommands(stats) {
      const grid = document.getElementById('commands-grid');
      grid.innerHTML = '';
      Object.keys(stats).forEach(cmd => {
        const item = stats[cmd];
        const card = document.createElement('div');
        card.className = 'command-item';
        card.innerHTML = \`
          <div class="command-header">
            <span class="command-name">\${cmd}</span>
            <span class="command-count">\${item.count}</span>
          </div>
          <div class="command-desc">\${item.desc}</div>
          <div class="command-meta">
            <span>Last Run</span>
            <span>\${item.lastUsed}</span>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    function renderLogs(logs) {
      const consoleEl = document.getElementById('logs-console');
      consoleEl.innerHTML = '';
      if (logs.length === 0) {
        consoleEl.innerHTML = '<div class="log-line"><span class="log-msg" style="color: var(--text-muted)">Waiting for system logs...</span></div>';
        return;
      }
      
      logs.forEach(log => {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = \`
          <span class="log-time">[\${formatTime(log.timestamp)}]</span>
          <span class="log-msg">\${log.message}</span>
        \`;
        consoleEl.appendChild(line);
      });

      if (autoscroll) {
        consoleEl.scrollTop = 0; // reverse order: newest at top
      }
    }

    function clearLogsUI() {
      const consoleEl = document.getElementById('logs-console');
      consoleEl.innerHTML = '<div class="log-line"><span class="log-msg" style="color: var(--text-muted)">Console view cleared.</span></div>';
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('latest-latency').innerText = data.latestLatency + ' ms';
        document.getElementById('sqlite-count').innerText = data.sqliteCount;
        document.getElementById('sqlite-health').innerText = data.sqliteHealth;
        document.getElementById('uptime-formatted').innerText = data.uptimeFormatted;
        
        renderLatencyGraph(data.latencyHistory);
        renderCommands(data.commandStats);
        renderLogs(data.logs);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    }

    // Initial fetch
    fetchStats();
    // Refresh stats every 2.5 seconds
    setInterval(fetchStats, 2500);
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
