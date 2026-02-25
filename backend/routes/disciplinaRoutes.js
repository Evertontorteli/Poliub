const express = require('express');
const router = express.Router();
const disciplinaController = require('../controllers/disciplinaController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

// GET /api/disciplinas   (?desativados=1 lista apenas desativadas)
router.get('/', verificaTokenComSessaoUnica, disciplinaController.listarDisciplinas);
// POST /api/disciplinas
router.post('/', verificaTokenComSessaoUnica, disciplinaController.criarDisciplina);
// POST /api/disciplinas/desativar-massa
router.post('/desativar-massa', verificaTokenComSessaoUnica, disciplinaController.desativarEmMassa);
// PUT /api/disciplinas/:id
router.put('/:id', verificaTokenComSessaoUnica, disciplinaController.atualizarDisciplina);
// DELETE /api/disciplinas/:id
router.delete('/:id', verificaTokenComSessaoUnica, disciplinaController.deletarDisciplina);

module.exports = router;
