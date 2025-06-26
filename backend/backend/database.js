const mysql = require('mysql2/promise');
require('dotenv').config();

// priorize a URL pública (MYSQL_PUBLIC_URL) antes da URL interna (MYSQL_URL)
const uri = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

let pool;
if (uri) {
  console.log('📦 DB URI (usando pública):', uri);
  pool = mysql.createPool(uri);
} else {
  // fallback local ou interno
  const config = {
    host:               process.env.MYSQLHOST     || 'localhost',
    user:               process.env.MYSQLUSER     || 'root',
    password:           process.env.MYSQLPASSWORD || 'senha123',
    database:           process.env.MYSQLDATABASE || 'poliub',
    port:               +process.env.MYSQLPORT    || 3306,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
  };
  console.log('📦 DB Config (fallback):', config);
  pool = mysql.createPool(config);
}

module.exports = {
  getConnection: () => pool.getConnection()
};
