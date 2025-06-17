const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'senha123',
  database: process.env.DB_NAME || 'poliub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// exporta uma função para pegar a conexão (melhor prática!)
module.exports = {
  getConnection: () => pool.getConnection()
};
