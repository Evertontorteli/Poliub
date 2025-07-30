// controllers/tratamentoController.js
const tratamentoModel = require('../models/tratamentoModel');
const evolucaoModel = require('../models/evolucaoModel');

exports.listarPorPaciente = async (req, res) => {
  try {
    const paciente_id = req.query.paciente_id;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' });
    const tratamentos = await tratamentoModel.findAllByPaciente(paciente_id);
    res.json(tratamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const dados = req.body;
    const novo = await tratamentoModel.create(dados);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;
    const atualizado = await tratamentoModel.update(id, dados);
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    const { id } = req.params;
    await tratamentoModel.delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FINALIZA tratamento E cria uma evolução!
exports.finalizar = async (req, res) => {
  try {
    const { id } = req.params;
    // 1) Atualiza o status do tratamento para 'finalizado'
    const tratamento = await tratamentoModel.update(id, { status: 'finalizado' });

    // 2) Cria uma evolução com os dados do tratamento
    const evolucao = await evolucaoModel.create({
      tratamento_id: id,
      texto: `Tratamento ${tratamento.tratamento} do dente ${tratamento.dente} foi finalizado`,
      aluno_id: tratamento.aluno_id,
      data: new Date(),
    });

    res.json({ sucesso: true, tratamento, evolucao });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
