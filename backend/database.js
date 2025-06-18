const mysql = require('mysql2/promise');
require('dotenv').config();

const uri = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

let pool;
if (uri) {
  console.log('📦 DB URI:', uri);
  pool = mysql.createPool(uri);
} else {
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
  console.log('📦 DB Config:', config);
  pool = mysql.createPool(config);
}

// exporta uma função para pegar a conexão (melhor prática!)
module.exports = {
  getConnection: () => pool.getConnection()
};
