require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const { initDb, getConnection } = require('./database');
const boxRoutes = require('./routes/boxRoutes');
const evolucaoRoutes = require('./routes/evolucaoRoutes');
const odontogramaRoutes = require('./routes/odontogramaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Cria o HTTP server e o Socket.IO em cima dele
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*' }  // depois bloqueie em prod, se quiser
});
// expõe o io para outros módulos via app.get('io')
app.set('io', io);

// ─── Bloco de presence e identificação ───
const onlineUsers = new Map();
io.on('connection', (socket) => {
  // quando o cliente se identifica (após login)
  socket.on('identify', (user) => {
    socket.user = user;
    onlineUsers.set(user.id, user);
    io.emit('onlineUsers', Array.from(onlineUsers.values()));
  });

  // quando desconecta, remove do mapa
  socket.on('disconnect', () => {
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
      io.emit('onlineUsers', Array.from(onlineUsers.values()));
    }
  });
});
// ──────────────────────────────────────────

(async () => {
  try {
    // 1) Conecta ao banco
    const pool = await initDb();
    app.locals.db = pool;

    // 2) Middlewares
    app.use(cors());
    app.options('*', cors());
    app.use(express.json());

    // 3) Rotas
    app.use('/api', authRouter);
    app.use('/api/pacientes', require('./routes/pacienteRoutes'));
    app.use('/api/alunos', require('./routes/alunoRoutes'));
    app.use('/api/disciplinas', require('./routes/disciplinaRoutes'));
    app.use('/api/agendamentos', require('./routes/agendamentoRoutes'));
    app.use('/api/periodos', require('./routes/periodosRoutes'));
    app.use('/api/boxes', boxRoutes);
    // Movimentações de esterilização
    app.use('/api/movimentacoes', require('./routes/movimentacaoRoutes'));
    app.use('/api/caixas', require('./routes/caixaRoutes'));
    app.use('/api/logs', require('./routes/logRoutes'));
    //cadastro Paciente
    app.use('/api/tratamentos', require('./routes/tratamentoRoutes'));
    app.use('/api/evolucoes', evolucaoRoutes);
    app.use('/api/odontogramas', odontogramaRoutes);




    app.get('/health-db', async (_req, res) => {
      try {
        const conn = await getConnection();
        const [rows] = await conn.query('SELECT 1 AS ok');
        conn.release();
        res.json({ db: rows[0].ok });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/', (_req, res) => res.send('API Poliub rodando 🚀'));

    // 4) Sobe o servidor HTTP (com Socket.IO embutido)
    server.listen(PORT, () =>
      console.log(`🔌 Servidor HTTP + Socket.IO rodando na porta ${PORT}`)
    );
  } catch (err) {
    console.error('❌ Falha ao inicializar o Banco de Dados:', err.message);
    process.exit(1);
  }
})();
