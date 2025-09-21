const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/encaminhamentoController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');

router.get('/', verificaTokenComSessaoUnica, ctrl.listarPorPaciente);
router.post('/', verificaTokenComSessaoUnica, ctrl.criar);
router.put('/:id', verificaTokenComSessaoUnica, ctrl.atualizar);
router.delete('/:id', verificaTokenComSessaoUnica, ctrl.deletar);

module.exports = router;


