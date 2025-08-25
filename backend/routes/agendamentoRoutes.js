const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agendamentoController');
const { verificaTokenComSessaoUnica, apenasRecepcao } = require('../middlewares/authMiddleware');

// Middleware global — protege todas as rotas abaixo!
router.use(verificaTokenComSessaoUnica);

// Rota legada pra aluno:
router.get('/meus', (req, res) => {
  if (req.user.role === 'aluno') return ctrl.listarMeusAgendamentos(req, res);
  return res.status(403).json({ error: 'Acesso negado.' });
});

// Continua existindo também o GET / para recepção:
router.get('/', (req, res) => {
  if (req.user.role === 'recepcao') return ctrl.listarAgendamentos(req, res);
  return res.status(403).json({ error: 'Acesso negado.' });
});

// GET /api/agendamentos
// → recepção: todos; aluno: só os próprios
router.get('/', (req, res) => {
  if (req.user.role === 'recepcao')      return ctrl.listarAgendamentos(req, res);
  else if (req.user.role === 'aluno')    return ctrl.listarMeusAgendamentos(req, res);
  else                                    return res.status(403).json({ error: 'Acesso negado.' });
});

// POST /api/agendamentos
router.post('/', ctrl.criarAgendamento);

// PUT /api/agendamentos/:id
router.put('/:id', ctrl.atualizarAgendamento);

// DELETE /api/agendamentos/:id
// Restrito à recepção no roteador para garantir bloqueio simples
router.delete('/:id', apenasRecepcao, ctrl.deletarAgendamento);

module.exports = router;
