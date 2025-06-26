const express = require('express');
const router = express.Router();
const boxController = require('../controllers/boxController');
const { verificaToken, apenasRecepcaoOuProprioAluno } = require('../middlewares/authMiddleware');

// CRUD de Boxes vinculados a um aluno
router.get('/:alunoId', verificaToken, apenasRecepcaoOuProprioAluno, boxController.listarPorAluno);
router.post('/', verificaToken, apenasRecepcaoOuProprioAluno, boxController.criarBox);
router.put('/:id', verificaToken, apenasRecepcaoOuProprioAluno, boxController.atualizarBox);
router.delete('/:id', verificaToken, apenasRecepcaoOuProprioAluno, boxController.deletarBox);

module.exports = router;
