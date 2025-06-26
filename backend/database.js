const mysql = require('mysql2/promise');
require('dotenv').config();

const commonConfig = {
  host:     process.env.MYSQLHOST     || 'localhost',
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || 'senha123',
  database: process.env.MYSQLDATABASE || 'poliub',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
};

async function createPoolWithFallback() {
  for (const port of [3306, 3307]) {
    try {
      console.log(`🔌 Tentando conectar na porta ${port}…`);
      const pool = mysql.createPool({ ...commonConfig, port });  // :contentReference[oaicite:0]{index=0}
      // testa de fato a conexão
      const conn = await pool.getConnection();
      conn.release();
      console.log(`✅ Conectado com sucesso na porta ${port}`);
      return pool;
    } catch (err) {
      console.warn(`❌ Falha ao conectar na porta ${port}:`, err.code || err.message);
    }
  }
  throw new Error('Não foi possível conectar em nenhuma porta (3306 ou 3307)');
}

let pool;
(async () => {
  pool = await createPoolWithFallback();
})();

module.exports = {
  getConnection: () => pool.getConnection()
};
