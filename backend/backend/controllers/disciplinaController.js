// controllers/disciplinaController.js
const Disciplina = require('../models/disciplinaModel');

exports.listarDisciplinas = async (req, res) => {
  try {
    const results = await Disciplina.listarTodos();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar disciplinas', details: err });
  }
};

exports.criarDisciplina = async (req, res) => {
  const { nome, periodo_id } = req.body;
  try {
    const result = await Disciplina.inserir({ nome, periodo_id });
    res.status(201).json({ id: result.insertId, nome, periodo_id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar disciplina', details: err });
  }
};

exports.atualizarDisciplina = async (req, res) => {
  const { id } = req.params;
  const { nome, periodo_id } = req.body;
  try {
    await Disciplina.atualizar(id, { nome, periodo_id });
    res.send('Disciplina atualizada!');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar disciplina', details: err });
  }
};

exports.deletarDisciplina = async (req, res) => {
  const { id } = req.params;
  try {
    await Disciplina.deletar(id);
    res.send('Disciplina deletada!');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar disciplina', details: err });
  }
};
