const { getConnection } = require('../database');

async function ensureSchema() {
  const conn = await getConnection();
  try {
    const [[dbRow]] = await conn.query('SELECT DATABASE() AS db');
    const db = dbRow.db;
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'app_settings'`,
      [db]
    );
    if (tables.length === 0) {
      await conn.query(
        `CREATE TABLE app_settings (
          k VARCHAR(128) PRIMARY KEY,
          v TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
  } finally {
    conn.release();
  }
}

const AppSettings = {
  async get(key) {
    const conn = await getConnection();
    try {
      const [rows] = await conn.query('SELECT v FROM app_settings WHERE k = ?', [key]);
      if (!rows[0]) return null;
      const raw = rows[0].v;
      try { return JSON.parse(raw); } catch { return raw; }
    } finally {
      conn.release();
    }
  },

  async set(key, value) {
    const conn = await getConnection();
    try {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      await conn.query(
        'INSERT INTO app_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = CURRENT_TIMESTAMP',
        [key, v]
      );
      return true;
    } finally {
      conn.release();
    }
  }
};

module.exports = { ...AppSettings, ensureSchema };


