// backend/dbQuery.js
const { getConnection } = require('./database');

async function dbQuery(sql, params = [], attempt = 1) {
  let conn;
  try {
    conn = await getConnection();
    const [rows] = await conn.execute(sql, params);
    return rows;
  } catch (err) {
    if (err?.code === 'PROTOCOL_CONNECTION_LOST' && attempt <= 2) {
      await new Promise(r => setTimeout(r, 150 * attempt));
      return dbQuery(sql, params, attempt + 1);
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
}
module.exports = { dbQuery };
