const odontogramaModel = require('../models/odontogramaModel');

// Lista odontograma por paciente
exports.listarPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' });
    const lista = await odontogramaModel.findByPaciente(paciente_id);
    res.json(lista);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cria/atualiza um dente do odontograma
exports.salvar = async (req, res) => {
  try {
    console.log("BODY:", req.body); // ADICIONE ESTA LINHA
    const { paciente_id, dente, faces, tipo_dente, alterado_por } = req.body;
    if (!paciente_id || !dente || !faces || !tipo_dente || !alterado_por) {
      return res.status(400).json({ error: 'Campos obrigatórios: paciente_id, dente, faces, tipo_dente, alterado_por' });
    }
    const salvo = await odontogramaModel.upsert({ paciente_id, dente, faces, tipo_dente, alterado_por });
    res.json(salvo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
