// backend/middlewares/agendamentoAuth.js
const Agendamento = require('../models/agendamentoModel');

async function apenasDonoOuRecepcao(req, res, next) {
  const { role, id: userId } = req.user;
  if (role === 'recepcao') return next();

  // se for aluno, verifica se o agendamento pertence a ele
  const ag = await Agendamento.buscarPorId(req.params.id);
  if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  if (ag.aluno_id !== userId) {
    return res.status(403).json({ error: 'Acesso negado: só pode alterar seus agendamentos.' });
  }
  next();
}

module.exports = { apenasDonoOuRecepcao };
