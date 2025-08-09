// backend/routes/backupRoutes.js
const express = require('express');
const path = require('path');
const router = express.Router();

const { verificaToken, apenasRecepcao } = require('../middlewares/authMiddleware');

// Controller principal (manual/run/ping)
const resolved = require.resolve('../controllers/backupController');
const backupController = require(resolved);

// Sanity check
if (
  !backupController ||
  typeof backupController.backupManual !== 'function' ||
  typeof backupController.runAndUpload !== 'function' ||
  typeof backupController.ping !== 'function'
) {
  console.error('[backupRoutes] ERRO: controller errado ou incompleto!');
  console.error('[backupRoutes] Recebi as chaves:', Object.keys(backupController || {}));
  throw new Error(
    'backupRoutes: esperado controllers/backupController com { backupManual, runAndUpload, ping }'
  );
}

// Rotas existentes
router.post('/manual', verificaToken, apenasRecepcao, backupController.backupManual);
router.post('/run',    verificaToken, apenasRecepcao, backupController.runAndUpload);
router.get('/ping',    verificaToken, apenasRecepcao, backupController.ping);

// ⬇️ NOVO: settings (precisa do controller abaixo)
const settingsController = require('../controllers/backupSettingsController');
router.get('/settings', verificaToken, apenasRecepcao, settingsController.getSettings);
router.put('/settings', verificaToken, apenasRecepcao, settingsController.putSettings);

module.exports = router;
