const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'chat_history.db'));

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function addMessage(userId, role, content) {
  const stmt = db.prepare('INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)');
  stmt.run(userId, role, content);
}

function getHistory(userId, limit = 10) {
  const stmt = db.prepare('SELECT role, content, timestamp, id FROM messages WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?');
  const rows = stmt.all(userId, limit);
  // Return in chronological order
  return rows.reverse().map(row => ({
    role: row.role,
    content: row.content
  }));
}

function clearHistory(userId) {
  const stmt = db.prepare('DELETE FROM messages WHERE user_id = ?');
  stmt.run(userId);
}

module.exports = {
  addMessage,
  getHistory,
  clearHistory
};
