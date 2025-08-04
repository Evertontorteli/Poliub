// backend/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const { buscaGlobal } = require('../controllers/searchController');
const { verificaTokenComSessaoUnica } = require('../middlewares/authMiddleware');
router.get('/', verificaTokenComSessaoUnica, buscaGlobal);
module.exports = router;
