const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodoController');

router.get('/', periodoController.listar);
router.get('/:id', periodoController.buscarPorId);
router.post('/', periodoController.criar);
router.put('/:id', periodoController.atualizar);
router.delete('/:id', periodoController.deletar);

module.exports = router;
