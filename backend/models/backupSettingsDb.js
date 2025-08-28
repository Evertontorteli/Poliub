// backend/models/backupSettingsDb.js
const { getConnection } = require('../database');

async function ensureTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS backup_settings (
      id INT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function readDb() {
  const conn = await getConnection();
  try {
    await ensureTable(conn);
    const [rows] = await conn.execute('SELECT data FROM backup_settings WHERE id = 1');
    if (rows.length === 0) return null;
    const raw = rows[0].data;
    // Some mysql drivers return string, others object for JSON
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } finally {
    conn.release();
  }
}

async function writeDb(settings) {
  const conn = await getConnection();
  try {
    await ensureTable(conn);
    const jsonStr = JSON.stringify(settings);
    await conn.execute(
      'INSERT INTO backup_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP',
      [jsonStr]
    );
  } finally {
    conn.release();
  }
}

module.exports = { readDb, writeDb };


