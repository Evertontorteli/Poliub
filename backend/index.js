require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb, getConnection } = require('./database');
const timezoneMiddleware = require('./middlewares/timezoneMiddleware');

const app = express();

// Porta única para HTTP + Socket.IO
const PORT = process.env.PORT || 3000;

// ── HTTP server + Socket.IO ───────────────────────────────
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } }); // ajuste CORS em prod

// expõe o io para outros módulos via app.get('io')
app.set('io', io);

// ── Presence / usuários online ────────────────────────────
const onlineUsers = new Map();
io.on('connection', (socket) => {
  socket.on('identify', (user) => {
    socket.user = user;
    onlineUsers.set(user.id, user);
    io.emit('onlineUsers', Array.from(onlineUsers.values()));
  });

  socket.on('disconnect', () => {
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
      io.emit('onlineUsers', Array.from(onlineUsers.values()));
    }
  });
});

// ── Bootstrap assíncrono ──────────────────────────────────
(async () => {
  try {
    // 1) Conecta ao banco
    const pool = await initDb();
    app.locals.db = pool;

    // 2) Middlewares
    app.use(cors());
    app.options('*', cors());
    app.use(express.json());
    
    // Middleware para configurar timezone UTC
    app.use(timezoneMiddleware);

    // 3) Rotas
    app.use('/api', require('./routes/auth'));
    app.use('/api/pacientes', require('./routes/pacienteRoutes'));
    app.use('/api/alunos', require('./routes/alunoRoutes'));
    app.use('/api/disciplinas', require('./routes/disciplinaRoutes'));
    app.use('/api/agendamentos', require('./routes/agendamentoRoutes'));
    app.use('/api/periodos', require('./routes/periodosRoutes'));
    app.use('/api/boxes', require('./routes/boxRoutes'));
    app.use('/api/movimentacoes', require('./routes/movimentacaoRoutes'));
    app.use('/api/caixas', require('./routes/caixaRoutes'));
    app.use('/api/logs', require('./routes/logRoutes'));
    app.use('/api/tratamentos', require('./routes/tratamentoRoutes'));
    app.use('/api/evolucoes', require('./routes/evolucaoRoutes'));
    app.use('/api/odontogramas', require('./routes/odontogramaRoutes'));
    app.use('/api/search', require('./routes/searchRoutes'));
    app.use('/api/backup', require('./routes/backupRoutes')); // <- mantém aqui

    // Healthchecks e raiz
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

    // 4) Sobe o servidor HTTP (única escuta)
    server.listen(PORT, () => {
      console.log(`🔌 Servidor HTTP + Socket.IO rodando na porta ${PORT}`);

      // Scheduler opcional (não bloqueia boot)
      if (process.env.ENABLE_BACKUP_SCHEDULER === 'true') {
        console.log('[scheduler] Habilitado. Iniciando...');
        try {
          require('./scheduler/backupScheduler').start();
        } catch (e) {
          console.error('[scheduler] Falha ao iniciar:', e.message);
        }
      } else {
        console.log('[scheduler] Desabilitado (ENABLE_BACKUP_SCHEDULER != "true")');
      }
    });
  } catch (err) {
    console.error('❌ Falha ao inicializar o Banco de Dados:', err.message);
    process.exit(1);
  }
})();
