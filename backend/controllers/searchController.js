// backend/controllers/searchController.js
const pool = require('../database');

async function buscaGlobal(req, res) {
  const termo = req.query.q;
  if (!termo) return res.json({ alunos: [], pacientes: [], disciplinas: [] });

  const conn = await pool.getConnection();
  try {
    const [alunos] = await conn.execute(
      `SELECT id, nome, usuario FROM alunos WHERE nome LIKE ? OR usuario LIKE ?`,
      [`%${termo}%`, `%${termo}%`]
    );
    const [pacientes] = await conn.execute(
      `SELECT id, nome, cpf FROM pacientes WHERE nome LIKE ? OR cpf LIKE ?`,
      [`%${termo}%`, `%${termo}%`]
    );
    const [disciplinas] = await conn.execute(
      `SELECT id, nome FROM disciplinas WHERE nome LIKE ?`,
      [`%${termo}%`]
    );
    res.json({ alunos, pacientes, disciplinas });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao pesquisar', details: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { buscaGlobal };
