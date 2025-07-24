// controllers/logController.js
const pool = require('../database');

exports.listarLogs = async (req, res) => {
  const { limit = 100, offset = 0, data } = req.query;
  const params = [];
  let sql = 'SELECT * FROM logs';

  if (data) {
    sql += ' WHERE DATE(criado_em) = ?';
    params.push(data); // formato 'YYYY-MM-DD'
  }

  sql += ' ORDER BY criado_em DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(sql, params);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar logs', details: err.message });
  }
};
