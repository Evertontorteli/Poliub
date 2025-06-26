// backend/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const authRouter = require('./routes/auth');
const { initDb, getConnection } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // 1) Conecta ao banco antes de tudo
    const pool = await initDb(); 
    app.locals.db = pool;

    // 2) Middlewares e rotas
    app.use(cors());
    app.options('*', cors());
    app.use(express.json());
    app.use('/api', authRouter);

    app.get('/health-db', async (_req, res) => {
      try {
        const conn   = await getConnection();
        const [rows] = await conn.query('SELECT 1 AS ok');
        conn.release();
        return res.json({ db: rows[0].ok });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    });

    app.use('/api/pacientes', require('./routes/pacienteRoutes'));
    app.use('/api/alunos',    require('./routes/alunoRoutes'));
    app.use('/api/disciplinas', require('./routes/disciplinaRoutes'));
    app.use('/api/agendamentos', require('./routes/agendamentoRoutes'));
    app.use('/api/periodos',    require('./routes/periodosRoutes'));

    app.get('/', (_req, res) => res.send('API Poliub rodando 🚀'));

    // 3) Só então sobe o servidor HTTP
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falha ao inicializar DB:', err.message);
    process.exit(1);
  }
})();
