// controllers/logController.js
const pool = require('../database');

exports.listarLogs = async (req, res) => {
  const { limit = 100, offset = 0, data } = req.query;
  const params = [];
  let sql = `SELECT 
               id,
               usuario_id,
               usuario_nome,
               acao,
               entidade,
               entidade_id,
               detalhes,
               DATE_FORMAT(
                 CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
                 '%Y-%m-%d %H:%i:%s'
               ) AS criado_em
             FROM logs`;

  if (data) {
    // Aplica filtro considerando timezone de São Paulo
    sql += " WHERE DATE(CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo')) = ?";
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
