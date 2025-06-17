// controllers/pacienteController.js
const { getConnection } = require('../database');

exports.criarOuBuscarPaciente = async (req, res) => {
  const { nome, telefone, numero_prontuario } = req.body;
  try {
    const conn = await getConnection();
    // Tenta buscar pelo telefone
    const [results] = await conn.query(
      'SELECT * FROM pacientes WHERE telefone = ?',
      [telefone]
    );
    if (results.length > 0) {
      conn.release();
      return res.json(results[0]);
    }
    // Não existe, cria novo (incluindo numero_prontuario opcional)
    const [insertResult] = await conn.query(
      'INSERT INTO pacientes (nome, telefone, numero_prontuario) VALUES (?, ?, ?)',
      [nome, telefone, numero_prontuario || null]
    );
    conn.release();
    res.status(201).json({
      id: insertResult.insertId,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar ou buscar paciente', details: err });
  }
};

exports.listarPacientes = async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM pacientes');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pacientes', details: err });
  }
};

exports.criarPaciente = async (req, res) => {
  const { nome, telefone, numero_prontuario } = req.body;
  try {
    const conn = await getConnection();
    const [insertResult] = await conn.query(
      'INSERT INTO pacientes (nome, telefone, numero_prontuario) VALUES (?, ?, ?)',
      [nome, telefone, numero_prontuario || null]
    );
    conn.release();
    res.status(201).json({
      id: insertResult.insertId,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar paciente', details: err });
  }
};

exports.atualizarPaciente = async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, numero_prontuario } = req.body;
  try {
    const conn = await getConnection();
    await conn.query(
      'UPDATE pacientes SET nome = ?, telefone = ?, numero_prontuario = ? WHERE id = ?',
      [nome, telefone, numero_prontuario || null, id]
    );
    conn.release();
    res.send('Paciente atualizado!');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar paciente', details: err });
  }
};

exports.deletarPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    await conn.query('DELETE FROM pacientes WHERE id = ?', [id]);
    conn.release();
    res.send('Paciente deletado!');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar paciente', details: err });
  }
};
