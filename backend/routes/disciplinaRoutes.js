const express = require('express');
const router = express.Router();
const disciplinaController = require('../controllers/disciplinaController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

// GET /api/disciplinas
router.get('/', verificaTokenComSessaoUnica, disciplinaController.listarDisciplinas);
// POST /api/disciplinas
router.post('/', verificaTokenComSessaoUnica, disciplinaController.criarDisciplina);
// PUT /api/disciplinas/:id
router.put('/:id', verificaTokenComSessaoUnica, disciplinaController.atualizarDisciplina);
// DELETE /api/disciplinas/:id
router.delete('/:id', verificaTokenComSessaoUnica, disciplinaController.deletarDisciplina);

module.exports = router;
