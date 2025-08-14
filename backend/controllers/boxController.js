// controllers/boxController.js
const { getConnection } = require('../database');

// Lista todos os boxes de um aluno específico
exports.listarPorAluno = async (req, res) => {
  const { alunoId } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const [boxes] = await conn.query(
      `SELECT 
         id,
         aluno_id,
         conteudo,
         DATE_FORMAT(
           CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
           '%Y-%m-%d %H:%i:%s'
         ) AS criado_em
       FROM boxes
       WHERE aluno_id = ?
       ORDER BY criado_em DESC`,
      [alunoId]
    );
    return res.json(boxes);
  } catch (err) {
    console.error('Erro ao listar boxes por aluno:', err);
    return res.status(500).json({
      error: 'Erro interno ao listar boxes',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};

// Cria um novo box para um aluno
exports.criarBox = async (req, res) => {
  const { aluno_id, conteudo } = req.body;
  if (!aluno_id || !conteudo) {
    return res.status(400).json({ error: 'aluno_id e conteudo são obrigatórios' });
  }
  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      'INSERT INTO boxes (aluno_id, conteudo) VALUES (?, ?)',
      [aluno_id, conteudo]
    );
    const [rows] = await conn.query(
      `SELECT 
         id,
         aluno_id,
         conteudo,
         DATE_FORMAT(
           CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
           '%Y-%m-%d %H:%i:%s'
         ) AS criado_em
       FROM boxes
       WHERE id = ?`,
      [result.insertId]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar box:', err);
    return res.status(500).json({
      error: 'Erro interno ao criar box',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};

// Atualiza o conteúdo de um box existente
exports.atualizarBox = async (req, res) => {
  const { id } = req.params;
  const { conteudo } = req.body;
  if (!conteudo) {
    return res.status(400).json({ error: 'conteudo é obrigatório' });
  }
  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      'UPDATE boxes SET conteudo = ? WHERE id = ?',
      [conteudo, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Box não encontrado' });
    }
    const [rows] = await conn.query(
      `SELECT 
         id,
         aluno_id,
         conteudo,
         DATE_FORMAT(
           CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
           '%Y-%m-%d %H:%i:%s'
         ) AS criado_em
       FROM boxes
       WHERE id = ?`,
      [id]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar box:', err);
    return res.status(500).json({
      error: 'Erro interno ao atualizar box',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};

// Deleta um box pelo seu ID
exports.deletarBox = async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await getConnection();
    const [result] = await conn.query(
      'DELETE FROM boxes WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Box não encontrado' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar box:', err);
    return res.status(500).json({
      error: 'Erro interno ao deletar box',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};
