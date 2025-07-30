// controllers/evolucaoController.js

const EvolucaoModel = require('../models/evolucaoModel');

exports.listarPorTratamento = async (req, res) => {
  try {
    const { tratamento_id } = req.query;
    if (!tratamento_id) return res.status(400).json({ error: 'tratamento_id é obrigatório' });
    const evolucoes = await EvolucaoModel.findAllByTratamento(tratamento_id);
    res.json(evolucoes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' });
    const evolucoes = await EvolucaoModel.findAllByPaciente(paciente_id);
    res.json(evolucoes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const dados = req.body;
    const evolucao = await EvolucaoModel.create(dados);
    res.status(201).json(evolucao);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
