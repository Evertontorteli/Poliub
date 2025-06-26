// backend/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initDb() {
  // 1) Se tiver host e porta (variáveis compartilhadas no Railway), use-as:
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
    console.log('✅ Conectado ao banco (via Service Variables)');
    return p;
  }

  // 2) Fallback para URL completa, se quiser usar MYSQL_URL
  if (process.env.MYSQL_URL) {
    console.log('📦 Conectando via MYSQL_URL (fallback)');
    const p = mysql.createPool(process.env.MYSQL_URL);
    await (await p.getConnection()).release();
    console.log('✅ Conectado ao banco (via URL)');
    return p;
  }

  // 3) Desenvolvimento local: tenta localhost:3306 e 3307
  const host     = 'localhost';
  const user     = process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQLPASSWORD || 'senha123';
  const database = process.env.MYSQLDATABASE || 'poliub';
  const baseCfg  = { host, user, password, database,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  };
  for (const port of [3306, 3307]) {
    try {
      console.log(`🔌 Tentando localhost:${port}`);
      const p = mysql.createPool({ ...baseCfg, port });
      await (await p.getConnection()).release();
      console.log(`✅ Conectado em localhost:${port}`);
      return p;
    } catch (err) {
      console.warn(`❌ Falha em localhost:${port}:`, err.code);
    }
  }

  throw new Error('Não foi possível conectar ao MySQL em nenhum lugar.');
}

// inicializa pool assim que o módulo for carregado
initDb()
  .then(p => pool = p)
  .catch(err => {
    console.error('❌ Erro ao inicializar DB:', err.message);
    process.exit(1);
  });

function getConnection() {
  if (!pool) throw new Error('Pool de conexões não inicializado');
  return pool.getConnection();
}

module.exports = { getConnection };
