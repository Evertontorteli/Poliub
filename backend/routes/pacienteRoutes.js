const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');


// 🔒 Adicione o verificaToken em todas as rotas que manipulam pacientes
router.get('/', verificaTokenComSessaoUnica, pacienteController.listarPacientes);
router.get('/:id/historico', verificaTokenComSessaoUnica, pacienteController.historicoPaciente);
router.get('/:id', verificaTokenComSessaoUnica, pacienteController.buscarPacientePorId);
router.post('/', verificaTokenComSessaoUnica, pacienteController.criarOuBuscarPaciente);
router.put('/:id', verificaTokenComSessaoUnica, pacienteController.atualizarPaciente);
router.delete('/:id', verificaTokenComSessaoUnica, pacienteController.deletarPaciente);

module.exports = router;
