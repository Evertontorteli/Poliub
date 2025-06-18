// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

const pacienteRoutes = require('./routes/pacienteRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const disciplinaRoutes = require('./routes/disciplinaRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const periodosRoutes = require('./routes/periodosRoutes');
const authRouter = require('./routes/auth');

const { verificaToken } = require('./middlewares/authMiddleware');

app.use(cors());
app.use(express.json());

// Health‐check para validar a conexão com o MySQL (retorna { db: 1 })
app.get('/health-db', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT 1 AS ok');
    await conn.release();
    return res.json({ db: rows[0].ok });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// Rotas abertas (são as que não precisam de token):
app.use('/api', authRouter); // /api/login

// A partir daqui, todas as rotas abaixo exigirão que você chame `verificaToken` individualmente
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/alunos', alunoRoutes);
app.use('/api/disciplinas', disciplinaRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/periodos', periodosRoutes);

app.get('/', (req, res) => {
  res.send('API Poliub rodando 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
