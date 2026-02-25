// controllers/disciplinaController.js
const Disciplina = require('../models/disciplinaModel');

exports.listarDisciplinas = async (req, res) => {
  try {
    const incluirDesativados = req.query.desativados === '1';
    const results = await Disciplina.listarTodos({ incluirDesativados });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar disciplinas', details: err });
  }
};

exports.criarDisciplina = async (req, res) => {
  const { nome, periodo_id, dia_semana } = req.body;
  try {
    const result = await Disciplina.inserir({ nome, periodo_id, dia_semana });
    res.status(201).json({ id: result.insertId, nome, periodo_id, dia_semana });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar disciplina', details: err });
  }
};

exports.atualizarDisciplina = async (req, res) => {
  const { id } = req.params;
  const { nome, periodo_id, dia_semana } = req.body;
  try {
    await Disciplina.atualizar(id, { nome, periodo_id, dia_semana });
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

exports.desativarEmMassa = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs é obrigatória.' });
  }
  try {
    const desativados = await Disciplina.desativarEmMassa(ids);
    res.json({ desativados });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar disciplinas em massa', details: err });
  }
};
