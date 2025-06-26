// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const { getConnection } = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

// Habilita CORS para todas as origens (simplifica debug e evita bloqueios)
app.use(cors());
// Responde a preflight OPTIONS
app.options('*', cors());

app.use(express.json());

// Rota pública de login
app.use('/api', authRouter);

// Health‐check para validar a conexão com o MySQL (retorna { db: 1 })
app.get('/health-db', async (req, res) => {
  try {
    const conn  = await getConnection();
    const [rows] = await conn.query('SELECT 1 AS ok');
    await conn.release();
    return res.json({ db: rows[0].ok });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Rotas protegidas (precisam de token conforme middleware individual)
app.use('/api/pacientes', require('./routes/pacienteRoutes'));
app.use('/api/alunos', require('./routes/alunoRoutes'));
app.use('/api/disciplinas', require('./routes/disciplinaRoutes'));
app.use('/api/agendamentos', require('./routes/agendamentoRoutes'));
app.use('/api/periodos', require('./routes/periodosRoutes'));

app.get('/', (_req, res) => {
  res.send('API Poliub rodando 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
