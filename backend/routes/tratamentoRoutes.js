// routes/tratamentoRoutes.js
const express = require('express');
const router = express.Router();
const tratamentoController = require('../controllers/tratamentoController');

router.get('/', tratamentoController.listarPorPaciente);
router.post('/', tratamentoController.criar);
router.put('/:id', tratamentoController.atualizar);
router.delete('/:id', tratamentoController.remover);
router.put('/:id/finalizar', tratamentoController.finalizar);

module.exports = router;
