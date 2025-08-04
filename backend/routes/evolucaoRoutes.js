const express = require('express');
const router = express.Router();
const evolucaoController = require('../controllers/evolucaoController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

// Lista evoluções por tratamento (via query param)
router.get('/tratamento', verificaTokenComSessaoUnica, evolucaoController.listarPorTratamento);

// Lista evoluções por paciente (via param na URL)
router.get('/paciente/:paciente_id', verificaTokenComSessaoUnica, evolucaoController.listarPorPaciente);

// Cria nova evolução
router.post('/', verificaTokenComSessaoUnica, evolucaoController.criar);

module.exports = router;
