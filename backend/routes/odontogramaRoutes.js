const express = require('express');
const router = express.Router();
const odontogramaController = require('../controllers/odontogramaController');

// Lista todos dentes/odontograma de um paciente
router.get('/paciente/:paciente_id', odontogramaController.listarPorPaciente);

// Salva/atualiza um dente do odontograma
router.post('/', odontogramaController.salvar);

module.exports = router;
