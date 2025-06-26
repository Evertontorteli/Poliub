// backend/database.js
const mysql = require('mysql2/promise');


require('dotenv').config();

let pool;

async function initDb() {
  // 1) URL pública completa (Railway plugin)
  const uri = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (uri) {
    console.log('📦 Conectando via URL completa');
    const p = mysql.createPool(uri);
    await (await p.getConnection()).release();
    console.log('✅ Conectado ao banco (via URL)');
    return p;
  }

  // 2) Service vars (host interno) — só se você não tiver a URL pública
  if (process.env.MYSQLHOST && process.env.MYSQLPORT) {
    console.log(`📦 Conectando em ${process.env.MYSQLHOST}:${process.env.MYSQLPORT}`);
    const p = mysql.createPool({
      host:     process.env.MYSQLHOST,
      port:     +process.env.MYSQLPORT,
      user:     process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0
    });
    await (await p.getConnection()).release();
    console.log('✅ Conectado via Service Variables');
    return p;
  }

  // 3) Fallback local: localhost:3306 → 3307
  const cfg = {
    host:     'localhost',
    user:     process.env.MYSQLUSER     || 'root',
    password: process.env.MYSQLPASSWORD || 'senha123',
    database: process.env.MYSQLDATABASE || 'poliub',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  };
  for (const port of [3306, 3307]) {
    try {
      console.log(`🔌 Tentando localhost:${port}`);
      const p = mysql.createPool({ ...cfg, port });
      await (await p.getConnection()).release();
      console.log(`✅ Conectado em localhost:${port}`);
      return p;
    } catch (_) { /* ignora e tenta próxima porta */ }
  }

  throw new Error('Não foi possível conectar ao MySQL em nenhum lugar.');
}

initDb()
  .then(p => { pool = p; })
  .catch(err => {
    console.error('❌ Erro ao inicializar DB:', err.message);
    process.exit(1);
  });

function getConnection() {
  if (!pool) throw new Error('Pool ainda não inicializado');
  return pool.getConnection();
}

module.exports = {
  initDb,
  getConnection
};
