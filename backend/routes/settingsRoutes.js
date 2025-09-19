const express = require('express');
const router = express.Router();
const { verificaToken, apenasRecepcao } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/settingsController');

// GET acessível para qualquer usuário autenticado (aluno ou recepção)
router.get('/feedback-prompt', verificaToken, ctrl.getFeedbackPrompt);
router.put('/feedback-prompt', verificaToken, apenasRecepcao, ctrl.putFeedbackPrompt);

// Janela de antecedência para Solicitar
router.get('/solicitacao-window', verificaToken, ctrl.getSolicitacaoWindow);
router.put('/solicitacao-window', verificaToken, apenasRecepcao, ctrl.putSolicitacaoWindow);

module.exports = router;


