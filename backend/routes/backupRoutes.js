// backend/routes/backupRoutes.js
const express = require('express');
const router = express.Router();

const { verificaToken, apenasRecepcao } = require('../middlewares/authMiddleware');

// Controllers corretos
const backupController   = require('../controllers/backupController');
const settingsController = require('../controllers/backupSettingsController');

// Sanity check simples
if (
  !backupController ||
  typeof backupController.backupManual   !== 'function' ||
  typeof backupController.runAndUpload   !== 'function' ||
  typeof backupController.ping           !== 'function'
) {
  throw new Error('backupRoutes: controller incompleto. Esperado { backupManual, runAndUpload, ping }');
}

// Rotas principais (backup)
router.post('/manual',  verificaToken, apenasRecepcao, backupController.backupManual);
router.post('/run',     verificaToken, apenasRecepcao, backupController.runAndUpload);
router.post('/test/mega', verificaToken, apenasRecepcao, backupController.testMega);
router.get('/ping',     verificaToken, apenasRecepcao, backupController.ping);

// Rotas de settings (salvar/ler configurações)
router.get('/settings', verificaToken, apenasRecepcao, settingsController.getSettings);
router.put('/settings', verificaToken, apenasRecepcao, settingsController.putSettings);

module.exports = router;
