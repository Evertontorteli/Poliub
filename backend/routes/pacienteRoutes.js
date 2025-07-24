const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { verificaToken } = require('../middlewares/authMiddleware');

// 🔒 Adicione o verificaToken em todas as rotas que manipulam pacientes
router.get('/', verificaToken, pacienteController.listarPacientes);
//router.post('/', verificaToken, pacienteController.criarPaciente);
router.post('/', verificaToken, pacienteController.criarOuBuscarPaciente);
router.put('/:id', verificaToken, pacienteController.atualizarPaciente);
router.delete('/:id', verificaToken, pacienteController.deletarPaciente);
router.get('/:id/historico', verificaToken, pacienteController.historicoPaciente);

module.exports = router;
