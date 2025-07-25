// backend/routes/caixaRoutes.js
const express = require('express');
const router = express.Router();
const { listarCaixas, criarCaixa, buscarPorCodigo, deletarCaixa, editarCaixa } = require('../controllers/caixaController');
const {
    verificaToken,
    apenasRecepcao,
    apenasRecepcaoOuProprioAluno
} = require('../middlewares/authMiddleware');

// lista todas as caixas
router.get('/', /*authorize('recepcao'),*/ listarCaixas);

// cria nova caixa
router.post('/', /*authorize('recepcao'),*/ criarCaixa);

// ** NOVA ROTA DELETE **
router.delete('/:id', deletarCaixa);

// busca pelo código de barras
router.get('/codigo/:codigo', /*authorize(),*/ buscarPorCodigo);

//Edita caixa
router.put('/:id', editarCaixa);

module.exports = router;
