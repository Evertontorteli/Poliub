// backend/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function testConnection(p) {
  const conn = await p.getConnection();
  await conn.release();
}

async function initDb() {
  const isProd = (process.env.NODE_ENV === 'production');
  const uri    = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

  // 🟢 PRODUÇÃO → Prioriza URL pública do Railway
  if (isProd) {
    if (!uri) throw new Error('Em produção, defina MYSQL_PUBLIC_URL ou MYSQL_URL.');
    console.log('📦 [PROD] Conectando ao banco (Railway URL)…');
    const p = mysql.createPool(uri);
    await testConnection(p);
    console.log('✅ [PROD] Conectado (Railway URL)');
    return p;
  }

  // 🧪 DESENVOLVIMENTO → Tenta local primeiro (3306 → 3307)
  console.log('💻 [DEV] Tentando banco local primeiro…');

  const localCfgBase = {
    host: process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'senha123',
    database: process.env.MYSQLDATABASE || 'poliub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  for (const port of [3306, 3307]) {
    try {
      console.log(`🔌 [DEV] Tentando localhost:${port}`);
      const p = mysql.createPool({ ...localCfgBase, port });
      await testConnection(p);
      console.log(`✅ [DEV] Conectado no local ${localCfgBase.host}:${port}`);
      return p;
    } catch (err) {
      // tenta próximo
    }
  }

  // Se tiver Service Vars locais (sem URL), tenta elas
  if (process.env.MYSQLHOST && process.env.MYSQLPORT) {
    try {
      const p = mysql.createPool({
        host: process.env.MYSQLHOST,
        port: +process.env.MYSQLPORT,
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log(`📦 [DEV] Tentando Service Vars ${process.env.MYSQLHOST}:${process.env.MYSQLPORT}`);
      await testConnection(p);
      console.log('✅ [DEV] Conectado via Service Vars');
      return p;
    } catch (err) {
      // segue o fluxo
    }
  }

  // Por último, se houver URL (ex.: você mantém a URL no .env), usa como fallback
  if (uri) {
    console.warn('⚠️ [DEV] Banco local indisponível. Caindo para a URL (Railway) como fallback.');
    const p = mysql.createPool(uri);
    await testConnection(p);
    console.log('✅ [DEV] Conectado via URL (fallback)');
    return p;
  }

  throw new Error('Não foi possível conectar ao MySQL (local, service vars ou URL).');
}

initDb()
  .then((p) => { pool = p; })
  .catch((err) => {
    console.error('❌ Erro ao inicializar DB:', err.message);
    process.exit(1);
  });

function getConnection() {
  if (!pool) throw new Error('Pool ainda não inicializado');
  return pool.getConnection();
}

module.exports = { initDb, getConnection };
