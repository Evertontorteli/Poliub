const Enc = require('../models/encaminhamentoModel');
const Log = require('../models/logModel');

exports.listarPorPaciente = async (req, res) => {
  try {
    const { paciente_id } = req.query;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' });
    const rows = await Enc.listarPorPaciente(Number(paciente_id));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar encaminhamentos', details: e.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const dados = req.body || {};
    if (!dados.paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' });
    const { id } = await Enc.inserir(dados);
    try {
      await Log.criar({
        usuario_id: req.user?.id,
        usuario_nome: req.user?.nome,
        acao: 'criou',
        entidade: 'encaminhamento',
        entidade_id: id,
        detalhes: dados
      });
    } catch {}
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar encaminhamento', details: e.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body || {};
    
    // Busca o estado atual do encaminhamento ANTES de alterar (para o log)
    const dadosAntes = await Enc.buscarPorId(Number(id));
    
    const r = await Enc.atualizar(Number(id), dados);
    try {
      await Log.criar({
        usuario_id: req.user?.id,
        usuario_nome: req.user?.nome,
        acao: 'atualizou',
        entidade: 'encaminhamento',
        entidade_id: id,
        detalhes: JSON.stringify({
          antes: dadosAntes,
          depois: dados
        })
      });
    } catch {}
    res.json({ ok: true, changed: r.changedRows ?? 0 });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar encaminhamento', details: e.message });
  }
};

exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await Enc.deletar(Number(id));
    try {
      await Log.criar({
        usuario_id: req.user?.id,
        usuario_nome: req.user?.nome,
        acao: 'deletou',
        entidade: 'encaminhamento',
        entidade_id: id
      });
    } catch {}
    res.json({ ok: true, affected: r.affectedRows ?? 0 });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao deletar encaminhamento', details: e.message });
  }
};


