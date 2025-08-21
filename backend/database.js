// backend/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// Configurações do Railway
const railwayConfig = require('./config/railway');

// Opções recomendadas para o pool (mysql2)
function poolOpts() {
  return {
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONN_LIMIT || 12),
    queueLimit: Number(process.env.MYSQL_QUEUE_LIMIT || 200),
    maxIdle: Number(process.env.MYSQL_MAX_IDLE || 12),      // limpa conexões ociosas
    idleTimeout: Number(process.env.MYSQL_IDLE_TIMEOUT || 60000), // 60s
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Configuração de timezone para resolver problema de 3 horas
    timezone: railwayConfig.mysql.timezone,
    dateStrings: railwayConfig.mysql.dateStrings,
    // Configurações de inicialização para forçar UTC
    multipleStatements: true,
  };
}

// Constrói pool a partir de uma URL (sem quebrar seu uso atual)
function poolFromUrl(uri) {
  try {
    const u = new URL(uri);
    const cfg = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '').replace(/^\//, ''),
      // Configuração de timezone para Railway
      timezone: railwayConfig.mysql.timezone,
      dateStrings: railwayConfig.mysql.dateStrings,
      multipleStatements: true,
    };
    const ssl = (u.searchParams.get('ssl') || '').toLowerCase();
    if (ssl && ssl !== 'false') cfg.ssl = { minVersion: 'TLSv1.2' }; // liga TLS se ?ssl=true
    return mysql.createPool({ ...cfg, ...poolOpts() });
  } catch {
    // fallback: conserva exatamente o comportamento antigo
    return mysql.createPool(uri);
  }
}

async function testConnection(p) {
  const conn = await p.getConnection();
  try { 
    await conn.query('SELECT 1'); 
    
    // Configura timezone da sessão para UTC usando configurações do Railway
    for (const sql of railwayConfig.mysql.initSql) {
      await conn.query(sql);
    }
    console.log('✅ Timezone configurado para UTC (+00:00) via Railway config');
    
  } finally { 
    conn.release(); 
  }
}

async function initDb() {
  const isProd = (process.env.NODE_ENV === 'production');
  const uri = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

  // 🟢 PRODUÇÃO → URL do Railway
  if (isProd) {
    if (!uri) throw new Error('Em produção, defina MYSQL_PUBLIC_URL ou MYSQL_URL.');
    console.log('📦 [PROD] Conectando ao banco (Railway URL)…');
    const p = poolFromUrl(uri);
    await testConnection(p);
    console.log('✅ [PROD] Conectado (Railway URL)');
    return p;
  }

  // 🧪 DESENVOLVIMENTO → localhost primeiro (seu fluxo original)
  console.log('💻 [DEV] Tentando banco local primeiro…');

  const localCfgBase = {
    host: process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'senha123',
    database: process.env.MYSQLDATABASE || 'poliub',
  };

  for (const port of [3306, 3307]) {
    try {
      console.log(`🔌 [DEV] Tentando localhost:${port}`);
      const p = mysql.createPool({ ...localCfgBase, port, ...poolOpts() });
      await testConnection(p);
      console.log(`✅ [DEV] Conectado no local ${localCfgBase.host}:${port}`);
      return p;
    } catch {
      // tenta o próximo
    }
  }

  // Se tiver host/port via env locais
  if (process.env.MYSQLHOST && process.env.MYSQLPORT) {
    try {
      console.log(`📦 [DEV] Tentando Service Vars ${process.env.MYSQLHOST}:${process.env.MYSQLPORT}`);
      const p = mysql.createPool({
        host: process.env.MYSQLHOST,
        port: Number(process.env.MYSQLPORT),
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE,
        ...poolOpts(),
      });
      await testConnection(p);
      console.log('✅ [DEV] Conectado via Service Vars');
      return p;
    } catch { /* segue o fluxo */ }
  }

  // Fallback: usar a URL (se você mantiver no .env)
  if (uri) {
    console.warn('⚠️ [DEV] Banco local indisponível. Caindo para a URL (Railway) como fallback.');
    const p = poolFromUrl(uri);
    await testConnection(p);
    console.log('✅ [DEV] Conectado via URL (fallback)');
    return p;
  }

  throw new Error('Não foi possível conectar ao MySQL (local, service vars ou URL).');
}

// Inicializa e ativa keep-alive
initDb().then((p) => {
  pool = p;
  setInterval(() => {
    pool.query('SELECT 1').catch(() => {}); // mantém as conexões vivas
  }, Number(process.env.MYSQL_PING_INTERVAL || 30000));
}).catch((err) => {
  console.error('❌ Erro ao inicializar DB:', err.message);
  process.exit(1);
});

function getConnection() {
  if (!pool) throw new Error('Pool ainda não inicializado');
  return pool.getConnection();
}

module.exports = { initDb, getConnection };
