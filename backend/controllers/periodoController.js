// controllers/periodoController.js
const { getConnection } = require('../database');

exports.listar = async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM periodos');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar períodos', details: err });
  }
};

exports.buscarPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM periodos WHERE id = ?', [id]);
    conn.release();
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Período não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar período', details: err });
  }
};

exports.criar = async (req, res) => {
  const { nome, turno } = req.body;
  try {
    const conn = await getConnection();
    const [result] = await conn.query(
      'INSERT INTO periodos (nome, turno) VALUES (?, ?)',
      [nome, turno]
    );
    conn.release();
    res.status(201).json({ id: result.insertId, nome, turno });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar período', details: err });
  }
};

exports.atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, turno } = req.body;
  try {
    const conn = await getConnection();
    await conn.query(
      'UPDATE periodos SET nome = ?, turno = ? WHERE id = ?',
      [nome, turno, id]
    );
    conn.release();
    res.json({ id, nome, turno });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar período', details: err });
  }
};

exports.deletar = async (req, res) => {
  const { id } = req.params;
  let conn;

  try {
    conn = await getConnection(); // mysql2/promise

    // 1) Verifica se há agendamentos vinculados ao período via disciplina
    const [agendamentos] = await conn.query(`
      SELECT a.id, a.aluno_id, a.data, a.hora
      FROM agendamentos a
      INNER JOIN disciplinas d ON a.disciplina_id = d.id
      WHERE d.periodo_id = ?
    `, [id]);

    if (agendamentos.length > 0) {
      return res.status(400).json({
        error: 'Existem agendamentos vinculados a este período',
        agendamentos
      });
    }

    // 2) Verifica se há disciplinas vinculadas ao período
    const [disciplinas] = await conn.query(
      'SELECT id, nome FROM disciplinas WHERE periodo_id = ?',
      [id]
    );

    if (disciplinas.length > 0) {
      return res.status(400).json({
        error: 'Existem disciplinas vinculadas a este período',
        disciplinas
      });
    }

    // 3) Se não houver nenhum vínculo, apaga o período
    const [result] = await conn.query(
      'DELETE FROM periodos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Período não encontrado' });
    }

    return res.json({ sucesso: true, message: 'Período excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar período:', err);
    return res.status(500).json({
      error: 'Erro interno ao deletar período',
      details: err.sqlMessage || err.message
    });
  } finally {
    if (conn) await conn.release();
  }
};