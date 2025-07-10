const express = require('express');
const router = express.Router();
const movController = require('../controllers/movimentacaoController');
const { verificaToken } = require('../middlewares/authMiddleware');

// Registra entrada de uma caixa
router.post('/entrada', verificaToken, movController.registrarEntrada);

// Registra saída de uma caixa
router.post('/saida', verificaToken, movController.registrarSaida);

// Lista todas as movimentações
router.get('/', verificaToken, movController.listarMovimentacoes);

// Lista movimentações de uma caixa específica
router.get('/caixa/:caixaId', verificaToken, movController.listarPorCaixa);

// Atualiza uma movimentação existente
router.put('/:id', verificaToken, movController.atualizarMovimentacao);

// Deleta uma movimentação existente
router.delete('/:id', verificaToken, movController.deletarMovimentacao);

// ...outras rotas acima

router.get('/estoque/:aluno_id', verificaToken, movController.estoquePorAluno);
router.get('/historico/:aluno_id', verificaToken, movController.historicoPorAluno);

module.exports = router;

