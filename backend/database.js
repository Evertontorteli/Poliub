const mysql = require('mysql2/promise');
require('dotenv').config();

// configura usando variáveis Railway (MYSQL_*) ou defaults locais
const config = {
  host:               process.env.MYSQL_HOST     || process.env.MYSQLHOST     || 'localhost',
  user:               process.env.MYSQL_USER     || process.env.MYSQLUSER     || 'root',
  password:           process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || 'senha123',
  database:           process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'poliub',
  port:               +process.env.MYSQL_PORT    || +process.env.MYSQLPORT    || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
};

// DEBUG: exibe nos logs qual configuração está sendo usada
console.log('📦 DB config:', config);

const pool = mysql.createPool(config);

// exporta uma função para pegar a conexão (melhor prática!)
module.exports = {
  getConnection: () => pool.getConnection()
};
