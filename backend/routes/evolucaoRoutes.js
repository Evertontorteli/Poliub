// routes/evolucaoRoutes.js
const express = require('express');
const router = express.Router();
const evolucaoController = require('../controllers/evolucaoController');
console.log("CONTROLLER DEBUG:", evolucaoController);

// Lista evoluções por tratamento (via query param)
router.get('/tratamento', evolucaoController.listarPorTratamento);

// Lista evoluções por paciente (via param na URL)
router.get('/paciente/:paciente_id', evolucaoController.listarPorPaciente);

// Cria nova evolução
router.post('/', evolucaoController.criar);

// routes/evolucaoRoutes.js
router.get('/paciente/:paciente_id', evolucaoController.listarPorPaciente);


module.exports = router;
