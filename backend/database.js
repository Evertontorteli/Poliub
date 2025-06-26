// backend/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool; // receberá o pool após init

async function initDb() {
  // 1) Se existir URI completa (Railway injeta MYSQL_URL), use-a:
  if (process.env.MYSQL_URL) {
    console.log('📦 Conectando via MYSQL_URL');
    const p = mysql.createPool(process.env.MYSQL_URL);
    await (await p.getConnection()).release();
    console.log('✅ Conectado ao banco (via URL)');
    return p;
  }

  // 2) Configurações básicas (dev)
  const host     = process.env.MYSQLHOST     || 'localhost';
  const user     = process.env.MYSQLUSER     || 'root';
  const password = process.env.MYSQLPASSWORD || 'senha123';
  const database = process.env.MYSQLDATABASE || 'poliub';

  const baseConfig = { host, user, password, database,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  };

  // 3) Portas a tentar: MYSQLPORT ou [3306, 3307]
  const envPort = process.env.MYSQLPORT
    ? parseInt(process.env.MYSQLPORT, 10)
    : null;
  const ports = envPort ? [envPort] : [3306, 3307];

  for (const port of ports) {
    try {
      console.log(`🔌 Tentando conectar em ${host}:${port}…`);
      const p = mysql.createPool({ ...baseConfig, port });
      await (await p.getConnection()).release();
      console.log(`✅ Conectado com sucesso em ${host}:${port}`);
      return p;
    } catch (err) {
      console.warn(`❌ Falha em ${host}:${port}:`, err.code || err.message);
    }
  }

  throw new Error(`Não foi possível conectar ao MySQL em ${host} nas portas ${ports.join(', ')}`);
}

// Dispara a inicialização assim que o módulo for carregado
initDb()
  .then(p => { pool = p; })
  .catch(err => {
    console.error('❌ Erro ao inicializar DB:', err.message);
    process.exit(1);
  });

// exporta somente getConnection para seu index.js
function getConnection() {
  if (!pool) {
    throw new Error('Pool de conexões ainda não inicializado');
  }
  return pool.getConnection();
}

module.exports = { getConnection };
