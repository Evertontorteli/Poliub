const express = require('express');
const router = express.Router();
const { listarCaixas, criarCaixa, buscarPorCodigo, deletarCaixa, editarCaixa } = require('../controllers/caixaController');
const {
    verificaTokenComSessaoUnica,
    apenasRecepcao,
    apenasRecepcaoOuProprioAluno
} = require('../middlewares/authMiddleware');

// lista todas as caixas (apenas usuários autenticados)
router.get('/', verificaTokenComSessaoUnica, listarCaixas);

// cria nova caixa (apenas recepção)
router.post('/', verificaTokenComSessaoUnica, apenasRecepcao, criarCaixa);

// ** NOVA ROTA DELETE ** (apenas recepção)
router.delete('/:id', verificaTokenComSessaoUnica, apenasRecepcao, deletarCaixa);

// busca pelo código de barras (apenas autenticado)
router.get('/codigo/:codigo', verificaTokenComSessaoUnica, buscarPorCodigo);

// Edita caixa (apenas recepção)
router.put('/:id', verificaTokenComSessaoUnica, apenasRecepcao, editarCaixa);

module.exports = router;
