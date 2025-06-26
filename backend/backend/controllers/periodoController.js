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
  try {
    const conn = await getConnection();
    await conn.query('DELETE FROM periodos WHERE id = ?', [id]);
    conn.release();
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar período', details: err });
  }
};
