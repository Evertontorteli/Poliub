// backend/routes/backupRoutes.js
const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verificaToken, apenasRecepcao } = require('../middlewares/authMiddleware');

// Ajuste as permissões conforme sua regra de negócio:
router.post('/manual', verificaToken, apenasRecepcao, backupController.backupManual);

module.exports = router;
