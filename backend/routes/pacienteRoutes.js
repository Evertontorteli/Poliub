// routes/pacienteRoutes.js
const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');

router.get('/', pacienteController.listarPacientes);
//router.post('/', pacienteController.criarPaciente);
router.post('/', pacienteController.criarOuBuscarPaciente);
router.put('/:id', pacienteController.atualizarPaciente);
router.delete('/:id', pacienteController.deletarPaciente);
router.get('/:id/historico', pacienteController.historicoPaciente);

module.exports = router;
