const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodoController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

router.get('/', verificaTokenComSessaoUnica, periodoController.listar);
router.get('/:id', verificaTokenComSessaoUnica, periodoController.buscarPorId);
router.post('/', verificaTokenComSessaoUnica, periodoController.criar);
router.put('/:id', verificaTokenComSessaoUnica, periodoController.atualizar);
router.delete('/:id', verificaTokenComSessaoUnica, periodoController.deletar);

module.exports = router;
