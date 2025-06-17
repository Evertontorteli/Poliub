// routes/disciplinaRoutes.js
const express = require('express');
const router = express.Router();
const disciplinaController = require('../controllers/disciplinaController');

// GET /api/disciplinas
router.get('/', disciplinaController.listarDisciplinas);
// POST /api/disciplinas
router.post('/', disciplinaController.criarDisciplina);
// PUT /api/disciplinas/:id
router.put('/:id', disciplinaController.atualizarDisciplina);
// DELETE /api/disciplinas/:id
router.delete('/:id', disciplinaController.deletarDisciplina);

module.exports = router;
