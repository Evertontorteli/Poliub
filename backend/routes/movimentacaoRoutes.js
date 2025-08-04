const express = require('express');
const router = express.Router();
const movController = require('../controllers/movimentacaoController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

// Registra entrada de uma caixa
router.post('/entrada', verificaTokenComSessaoUnica, movController.registrarEntrada);

// Registra saída de uma caixa
router.post('/saida', verificaTokenComSessaoUnica, movController.registrarSaida);

// Lista todas as movimentações
router.get('/', verificaTokenComSessaoUnica, movController.listarMovimentacoes);

// Lista movimentações de uma caixa específica
router.get('/caixa/:caixaId', verificaTokenComSessaoUnica, movController.listarPorCaixa);

// Atualiza uma movimentação existente
router.put('/:id', verificaTokenComSessaoUnica, movController.atualizarMovimentacao);

// Deleta uma movimentação existente
router.delete('/:id', verificaTokenComSessaoUnica, movController.deletarMovimentacao);

// ...outras rotas acima

router.get('/estoque/:aluno_id', verificaTokenComSessaoUnica, movController.estoquePorAluno);
router.get('/historico/:aluno_id', verificaTokenComSessaoUnica, movController.historicoPorAluno);

module.exports = router;
