/**
 * Migração: adiciona coluna ativo na tabela alunos (1 = ativo, 0 = desativado).
 * Alunos desativados não podem mais acessar o sistema.
 * Execute uma vez a partir da pasta backend: node scripts/add-ativo-alunos.js
 */
const path = require('path');
// Carrega .env da pasta backend ou da raiz do projeto (mesma lógica do app)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mysql = require('mysql2/promise');

async function run() {
  const url = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  let conn;
  try {
    if (url) {
      conn = await mysql.createConnection(url);
    } else {
      conn = await mysql.createConnection({
        host: process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || 'senha123',
        database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'poliub',
      });
    }
    await conn.execute(`
      ALTER TABLE alunos
      ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1
    `);
    console.log('Coluna "ativo" adicionada na tabela alunos.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna "ativo" já existe. Nada a fazer.');
    } else {
      throw err;
    }
  } finally {
    if (conn) await conn.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
