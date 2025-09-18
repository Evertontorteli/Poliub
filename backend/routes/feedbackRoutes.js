const express = require('express');
const router = express.Router();
const { verificaToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/feedbackController');

// Criar feedback (autenticado para sabermos role/usuário; pode permitir anônimo se quiser)
router.post('/', verificaToken, ctrl.criar);

// Listar feedbacks (somente recepção/admin se necessário; por enquanto protegido por token)
router.get('/', verificaToken, ctrl.listar);

// Resumo (nps, totais)
router.get('/resumo', verificaToken, ctrl.resumo);

module.exports = router;


