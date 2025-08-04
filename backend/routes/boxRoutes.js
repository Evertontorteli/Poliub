const express = require('express');
const router = express.Router();
const boxController = require('../controllers/boxController');
const { verificaTokenComSessaoUnica, apenasRecepcaoOuProprioAluno } = require('../middlewares/authMiddleware');

// CRUD de Boxes vinculados a um aluno
router.get('/:alunoId', verificaTokenComSessaoUnica, apenasRecepcaoOuProprioAluno, boxController.listarPorAluno);
router.post('/', verificaTokenComSessaoUnica, apenasRecepcaoOuProprioAluno, boxController.criarBox);
router.put('/:id', verificaTokenComSessaoUnica, apenasRecepcaoOuProprioAluno, boxController.atualizarBox);
router.delete('/:id', verificaTokenComSessaoUnica, apenasRecepcaoOuProprioAluno, boxController.deletarBox);

module.exports = router;
