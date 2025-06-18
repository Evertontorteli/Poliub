const mysql = require('mysql2/promise');
require('dotenv').config();

// Se houver URL completa (Railway), usa ela; caso contrário monta o objeto
const poolConfig = process.env.MYSQL_URL
  || process.env.MYSQL_PUBLIC_URL
  || {
    host:               process.env.MYSQL_HOST     || 'localhost',
    user:               process.env.MYSQL_USER     || 'root',
    password:           process.env.MYSQL_PASSWORD || 'senha123',
    database:           process.env.MYSQLDATABASE || 'poliub',
    port:               +process.env.MYSQL_PORT    || 3306,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  };

// DEBUG: exibe nos logs qual configuração está sendo usada
console.log('📦 DB config:', poolConfig);

const pool = mysql.createPool(poolConfig);

// exporta uma função para pegar a conexão (melhor prática!)
module.exports = {
  getConnection: () => pool.getConnection()
};
