const express = require('express');
const router = express.Router();
const odontogramaController = require('../controllers/odontogramaController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

// Lista todos dentes/odontograma de um paciente
router.get('/paciente/:paciente_id', verificaTokenComSessaoUnica, odontogramaController.listarPorPaciente);

// Salva/atualiza um dente do odontograma
router.post('/', verificaTokenComSessaoUnica, odontogramaController.salvar);

module.exports = router;
