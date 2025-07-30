const TratamentoModel = require('../models/tratamentoModel');

exports.listarPorPaciente = async (req, res) => {
  try {
    const tratamentos = await TratamentoModel.findAllByPaciente(req.query.paciente_id);
    res.json(tratamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const tratamento = await TratamentoModel.create(req.body);
    res.status(201).json(tratamento);
  } catch (err) {
    console.error('Erro ao salvar tratamento:', err); // <-- ADICIONE ISSO
    res.status(500).json({ error: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const tratamento = await TratamentoModel.update(req.params.id, req.body);
    res.json(tratamento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remover = async (req, res) => {
  try {
    await TratamentoModel.delete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
