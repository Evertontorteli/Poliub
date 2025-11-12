// backend/controllers/agendamentoController.js

const Agendamento = require('../models/agendamentoModel');
const db = require('../database'); // getConnection()
const Log = require('../models/logModel.js');
const AppSettings = require('../models/appSettingsModel');
// 6) CANCELAR AGENDAMENTO (status="Cancelado")
exports.cancelarAgendamento = async (req, res) => {
  const { id } = req.params;
  const { motivo = '' } = req.body || {};
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute('SELECT * FROM agendamentos WHERE id = ?', [id]);
    const atual = rows[0];
    if (!atual) {
      conn.release();
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Permissões: recepção pode cancelar qualquer; aluno só os próprios (operador/aux1/aux2)
    if (req.user.role === 'aluno') {
      const uid = String(req.user.id);
      const envolvidos = [atual.aluno_id, atual.auxiliar1_id, atual.auxiliar2_id].map(v => String(v));
      if (!envolvidos.includes(uid)) {
        conn.release();
        return res.status(403).json({ error: 'Não autorizado a cancelar este agendamento.' });
      }
    } else if (req.user.role !== 'recepcao') {
      conn.release();
      return res.status(403).json({ error: 'Role não autorizado para cancelar agendamento.' });
    }

    // Validação: motivo obrigatório com pelo menos 15 caracteres
    const motivoTrimmed = String(motivo || '').trim();
    if (motivoTrimmed.length < 15) {
      conn.release();
      return res.status(400).json({ error: 'O motivo do cancelamento é obrigatório e deve ter no mínimo 15 caracteres.' });
    }

    await Agendamento.atualizarStatus(id, 'Cancelado');

    // LOG
    await Log.criar({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'cancelou',
      entidade: 'agendamento',
      entidade_id: id,
      detalhes: { motivo: motivoTrimmed }
    });
    conn.release();

    // Notificação opcional via socket
    try {
      const io = req.app.get('io');
      io && io.emit('agendamento:cancelado', {
        id: Number(id),
        por: req.user.role,
        por_nome: req.user && req.user.nome ? req.user.nome : undefined,
        motivo: motivoTrimmed
      });
    } catch {}

    return res.json({ mensagem: 'Agendamento cancelado.' });
  } catch (err) {
    console.error('Erro ao cancelar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
};


/**
 * Lê a tabela `boxes` e anexa a cada agendamento
 * o campo `operadorBox` com o conteúdo do box do operador.
 */
async function adicionaBoxAoOperador(agendamentos) {
  if (agendamentos.length === 0) return agendamentos;

  const conn = await db.getConnection();
  try {
    // 1) extrai IDs de operador únicos
    const operadorIds = [
      ...new Set(agendamentos.map(a => Number(a.aluno_id)))
    ];

    // 2) busca o conteúdo desses boxes na tabela boxes
    const [rows] = await conn.query(
      'SELECT aluno_id, conteudo FROM boxes WHERE aluno_id IN (?)',
      [operadorIds]
    );

    // 3) monta mapa aluno_id → conteudo
    const mapa = rows.reduce((m, { aluno_id, conteudo }) => {
      m[aluno_id] = conteudo;
      return m;
    }, {});

    // 4) retorna nova lista com operadorBox anexado
    return agendamentos.map(a => ({
      ...a,
      operadorBox: mapa[a.aluno_id] ?? null
    }));
  } finally {
    conn.release();
  }
}

/**
 * Anexa "canceledReason", "canceledBy" e "canceledAt" aos agendamentos a partir da tabela de logs
 * Considera o último log (mais recente) com { entidade='agendamento', acao='cancelou' }
 */
async function anexarMotivoCancelamento(agendamentos) {
  if (!Array.isArray(agendamentos) || agendamentos.length === 0) return agendamentos;
  const conn = await db.getConnection();
  try {
    const ids = [...new Set(agendamentos.map(a => Number(a.id)).filter(Boolean))];
    if (ids.length === 0) return agendamentos;

    const [rows] = await conn.query(
      `SELECT entidade_id, detalhes, usuario_nome,
              DATE_FORMAT(
                CONVERT_TZ(criado_em, '+00:00', 'America/Sao_Paulo'),
                '%Y-%m-%d %H:%i:%s'
              ) AS criado_em
         FROM logs
        WHERE entidade = 'agendamento' AND acao = 'cancelou' AND entidade_id IN (?)
        ORDER BY id DESC`,
      [ids]
    );
    const map = new Map();
    for (const r of rows) {
      const key = Number(r.entidade_id);
      if (map.has(key)) continue; // já temos o mais recente
      let motivo = '';
      const d = r.detalhes || '';
      try {
        const trimmed = String(d).trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const obj = JSON.parse(trimmed);
          motivo = obj && typeof obj.motivo === 'string' ? obj.motivo : '';
        } else {
          motivo = trimmed;
        }
      } catch { motivo = ''; }
      map.set(key, {
        motivo: motivo,
        canceledBy: r.usuario_nome || '',
        canceledAt: r.criado_em || ''
      });
    }
    return agendamentos.map(a => {
      const cancelInfo = map.get(Number(a.id));
      if (cancelInfo) {
        return {
          ...a,
          canceledReason: cancelInfo.motivo || a.canceledReason || '',
          canceledBy: cancelInfo.canceledBy,
          canceledAt: cancelInfo.canceledAt
        };
      }
      return { ...a, canceledReason: a.canceledReason || '' };
    });
  } finally {
    conn.release();
  }
}

// 1) LISTAR TODOS OS AGENDAMENTOS (só recepção)
exports.listarAgendamentos = async (req, res) => {
  try {
    const { disciplinaId } = req.query;
    let results = await Agendamento.listarTodos();

    if (disciplinaId) {
      results = results.filter(
        ag =>
          String(ag.disciplina_id) === String(disciplinaId) ||
          String(ag.disciplinaId) === String(disciplinaId)
      );
    }

    results = await adicionaBoxAoOperador(results);
    results = await anexarMotivoCancelamento(results);
    return res.json(results);
  } catch (err) {
    console.error('Erro ao listar agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// 2) LISTAR MEUS AGENDAMENTOS (só aluno, operador ou auxiliar)
exports.listarMeusAgendamentos = async (req, res) => {
  try {
    const userId = String(req.user.id);
    let resultados = await Agendamento.listarTodos();

    resultados = resultados.filter(ag =>
      String(ag.aluno_id) === userId ||
      String(ag.auxiliar1_id) === userId ||
      String(ag.auxiliar2_id) === userId
    );

    resultados = await adicionaBoxAoOperador(resultados);
    resultados = await anexarMotivoCancelamento(resultados);
    return res.json(resultados);
  } catch (err) {
    console.error('Erro ao listar meus agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar seus agendamentos.' });
  }
};

/************************************************************************************* */

/// 3) CRIAR AGENDAMENTO

exports.criarAgendamento = async (req, res) => {
  try {
    let {
      aluno_id,
      disciplina_id,
      paciente_id,
      data,
      hora,
      status,
      solicitado_por_recepcao,
      observacoes,
      auxiliar1_id,
      auxiliar2_id,
      nome_paciente,
      telefone
    } = req.body;

    // normalize empty strings to null
    auxiliar1_id = auxiliar1_id === '' ? null : auxiliar1_id;
    auxiliar2_id = auxiliar2_id === '' ? null : auxiliar2_id;

    const io = req.app.get('io');

    // ===== AJUSTE DE DATA (só parte do dia, sem fuso) =====
    function toLocalDate(dateStr) {
      if (!dateStr) return null;
      const [yyyy, mm, dd] = dateStr.split('-');
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAgendamento = toLocalDate(data);

    // Recepção: pode agendar retroativo e até 365 dias à frente.
    // Aluno: nunca pode agendar retroativo, e só pode até 365 dias à frente.
    const limiteMax = new Date();
    limiteMax.setHours(0, 0, 0, 0);
    limiteMax.setDate(limiteMax.getDate() + 365);

    if (!dataAgendamento) {
      return res.status(400).json({ error: 'Data do agendamento é inválida.' });
    }

    if (dataAgendamento > limiteMax) {
      return res.status(400).json({
        error: 'A data do agendamento não pode ser superior a 365 dias a partir de hoje.'
      });
    }

    if (req.user.role === 'aluno' && dataAgendamento < hoje) {
      return res.status(400).json({
        error: 'Não é possível realizar agendamentos para datas anteriores à data atual.'
      });
    }

    // Validação de bloqueio de agendamento no mesmo dia da disciplina
    // Bloqueia apenas se tentar agendar para HOJE e HOJE for dia de atendimento da disciplina
    // APENAS PARA ALUNOS - Recepção pode agendar normalmente
    const bloqueioConfig = await AppSettings.get('bloquear_agendamento_mesmo_dia');
    if (bloqueioConfig?.enabled && req.user.role === 'aluno' && disciplina_id && data) {
      // Verifica se a data do agendamento é HOJE
      // Usa a mesma variável 'hoje' criada acima (linha 226-227) e compara com dataAgendamento
      // Ambos estão no mesmo formato (Date com horas zeradas no fuso local)
      if (dataAgendamento && hoje && dataAgendamento.getTime() === hoje.getTime()) {
        // Data é HOJE, verifica se hoje é dia de atendimento da disciplina
        const conn = await db.getConnection();
        try {
          const [discRows] = await conn.query(
            'SELECT dia_semana FROM disciplinas WHERE id = ?',
            [disciplina_id]
          );
          if (discRows[0]?.dia_semana) {
            const diaSemanaDisc = String(discRows[0].dia_semana).toLowerCase().trim();
            
            // Mapeia o dia da semana de HOJE
            const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            const diaHoje = diasSemana[hoje.getDay()].toLowerCase();
            
            // Normaliza para comparação
            const normalizarDia = (d) => {
              return d.replace(/[áàâã]/g, 'a')
                      .replace(/[éêë]/g, 'e')
                      .replace(/[íîï]/g, 'i')
                      .replace(/[óôõö]/g, 'o')
                      .replace(/[úûü]/g, 'u')
                      .replace(/ç/g, 'c');
            };
            
            const diaHojeNormalizado = normalizarDia(diaHoje);
            const discNormalizado = normalizarDia(diaSemanaDisc);
            
            if (diaHojeNormalizado === discNormalizado) {
              conn.release();
              return res.status(400).json({
                error: 'Não é possível agendar pacientes para hoje, pois hoje é dia de atendimento da disciplina. Por favor, escolha outra data.'
              });
            }
          }
        } finally {
          conn.release();
        }
      }
    }

    // → SE FOR RECEPCAO: sem restrição extra
    if (req.user.role === 'recepcao') {
      const insertResult = await Agendamento.inserir({
        aluno_id,
        disciplina_id,
        paciente_id,
        data,
        hora,
        status,
        solicitado_por_recepcao,
        observacoes,
        auxiliar1_id,
        auxiliar2_id,
        nome_paciente,
        telefone
      });
      const novoId = insertResult.insertId ?? insertResult;

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'criou',
        entidade: 'agendamento',
        entidade_id: novoId,
        detalhes: {
          aluno_id,
          disciplina_id,
          paciente_id,
          data,
          hora,
          status,
          solicitado_por_recepcao,
          observacoes,
          auxiliar1_id,
          auxiliar2_id,
          nome_paciente,
          telefone
        }
      });

      // Notificação
      const conn2 = await db.getConnection();
      try {
        const [agRows] = await conn2.execute(`
          SELECT 
            ag.nome_paciente,
            al.nome            AS nome_aluno,
            ag.data,
            ag.hora,
            d.nome             AS disciplina_nome,
            p.nome             AS periodo_nome,
            p.turno            AS periodo_turno
          FROM agendamentos ag
          JOIN alunos      al ON ag.aluno_id      = al.id
          JOIN disciplinas d  ON ag.disciplina_id = d.id
          JOIN periodos    p  ON d.periodo_id     = p.id
          WHERE ag.id = ?
        `, [novoId]);

        const info = agRows[0] || {};
        io.emit('novoAgendamentoRecepcao', {
          id: novoId,
          nome_aluno: info.nome_aluno,
          nome_paciente: info.nome_paciente,
          data: info.data,
          hora: info.hora,
          disciplina_nome: info.disciplina_nome,
          periodo_nome: info.periodo_nome,
          periodo_turno: info.periodo_turno
        });
      } finally {
        conn2.release();
      }

      return res.status(201).json({ id: novoId });
    }

    // → SE FOR ALUNO: valida se está em um dos papéis
    if (req.user.role === 'aluno') {
      const userId = String(req.user.id);
      const roles = [
        String(aluno_id),
        auxiliar1_id ? String(auxiliar1_id) : null,
        auxiliar2_id ? String(auxiliar2_id) : null
      ];
      const envolvimentoCount = roles.filter(r => r === userId).length;

      if (envolvimentoCount === 0) {
        return res.status(403).json({
          error: 'Para agendar, você deve ser Operador ou Auxiliar. Selecione seu nome em um dos papéis.'
        });
      }
      if (envolvimentoCount > 1) {
        return res.status(403).json({
          error: 'Você não pode ocupar mais de um papel no mesmo agendamento.'
        });
      }
      if (!aluno_id) {
        return res.status(400).json({
          error: 'O campo Operador é obrigatório.'
        });
      }

      const insertResult = await Agendamento.inserir({
        aluno_id,
        disciplina_id,
        paciente_id,
        data,
        hora,
        status,
        solicitado_por_recepcao,
        observacoes,
        auxiliar1_id,
        auxiliar2_id,
        nome_paciente,
        telefone
      });
      const novoId = insertResult.insertId ?? insertResult;

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'criou',
        entidade: 'agendamento',
        entidade_id: novoId,
        detalhes: {
          aluno_id,
          disciplina_id,
          paciente_id,
          data,
          hora,
          status,
          solicitado_por_recepcao,
          observacoes,
          auxiliar1_id,
          auxiliar2_id,
          nome_paciente,
          telefone
        }
      });

      // Notificação para recepção quando aluno cria agendamento
      const conn2 = await db.getConnection();
      try {
        const [agRows] = await conn2.execute(`
          SELECT 
            ag.nome_paciente,
            al.nome            AS nome_aluno,
            ag.data,
            ag.hora,
            d.nome             AS disciplina_nome,
            p.nome             AS periodo_nome,
            p.turno            AS periodo_turno
          FROM agendamentos ag
          JOIN alunos      al ON ag.aluno_id      = al.id
          JOIN disciplinas d  ON ag.disciplina_id = d.id
          JOIN periodos    p  ON d.periodo_id     = p.id
          WHERE ag.id = ?
        `, [novoId]);

        const info = agRows[0] || {};
        io.emit('novoAgendamentoRecepcao', {
          id: novoId,
          nome_aluno: info.nome_aluno,
          nome_paciente: info.nome_paciente,
          data: info.data,
          hora: info.hora,
          disciplina_nome: info.disciplina_nome,
          periodo_nome: info.periodo_nome,
          periodo_turno: info.periodo_turno
        });
      } finally {
        conn2.release();
      }

      return res.status(201).json({ id: novoId });
    }

    // → outros roles não autorizados
    return res.status(403).json({ error: 'Role não autorizado para criar agendamento.' });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
};




/************************************************************************************* */

// 4) ATUALIZAR AGENDAMENTO
exports.atualizarAgendamento = async (req, res) => {
  const { id } = req.params;
  const dados = { ...req.body };
  dados.auxiliar1_id = dados.auxiliar1_id === '' ? null : dados.auxiliar1_id;
  dados.auxiliar2_id = dados.auxiliar2_id === '' ? null : dados.auxiliar2_id;

  try {
    // Busca o estado atual do agendamento ANTES de alterar (para o log)
    const conn = await db.getConnection();
    const [antesRows] = await conn.execute(
      `SELECT a.*, 
              p.nome as paciente_nome,
              al.nome as aluno_nome,
              d.nome as disciplina_nome,
              aux1.nome as auxiliar1_nome,
              aux2.nome as auxiliar2_nome,
              per.nome as periodo_nome
       FROM agendamentos a 
       LEFT JOIN pacientes p ON a.paciente_id = p.id 
       LEFT JOIN alunos al ON a.aluno_id = al.id
       LEFT JOIN disciplinas d ON a.disciplina_id = d.id
       LEFT JOIN alunos aux1 ON a.auxiliar1_id = aux1.id
       LEFT JOIN alunos aux2 ON a.auxiliar2_id = aux2.id
       LEFT JOIN periodos per ON al.periodo_id = per.id
       WHERE a.id = ?`,
      [id]
    );
    const dadosAntes = antesRows[0] || null;
    
    // Função auxiliar para buscar nomes de IDs
    const buscarNomes = async (ids) => {
      const nomes = {};
      
      // Buscar nome do paciente
      if (ids.paciente_id) {
        const [rows] = await conn.execute('SELECT nome FROM pacientes WHERE id = ?', [ids.paciente_id]);
        if (rows[0]) nomes.paciente_nome = rows[0].nome;
      }
      
      // Buscar nome do aluno
      if (ids.aluno_id) {
        const [rows] = await conn.execute('SELECT nome FROM alunos WHERE id = ?', [ids.aluno_id]);
        if (rows[0]) nomes.aluno_nome = rows[0].nome;
      }
      
      // Buscar nome da disciplina
      if (ids.disciplina_id) {
        const [rows] = await conn.execute('SELECT nome FROM disciplinas WHERE id = ?', [ids.disciplina_id]);
        if (rows[0]) nomes.disciplina_nome = rows[0].nome;
      }
      
      // Buscar nome do auxiliar1
      if (ids.auxiliar1_id) {
        const [rows] = await conn.execute('SELECT nome FROM alunos WHERE id = ?', [ids.auxiliar1_id]);
        if (rows[0]) nomes.auxiliar1_nome = rows[0].nome;
      }
      
      // Buscar nome do auxiliar2
      if (ids.auxiliar2_id) {
        const [rows] = await conn.execute('SELECT nome FROM alunos WHERE id = ?', [ids.auxiliar2_id]);
        if (rows[0]) nomes.auxiliar2_nome = rows[0].nome;
      }
      
      // Buscar nome do período (precisa do aluno_id primeiro)
      if (ids.periodo_id) {
        const [rows] = await conn.execute('SELECT nome FROM periodos WHERE id = ?', [ids.periodo_id]);
        if (rows[0]) nomes.periodo_nome = rows[0].nome;
      }
      
      return nomes;
    };
    
    // Busca nomes para o "depois"
    const nomesDepois = await buscarNomes(dados);

    // Valida permissões e faz o update como já fazia
    if (req.user.role === 'recepcao') {
      await Agendamento.atualizar(id, dados);

      // Prepara dados para o log incluindo nomes
      const antesLog = { ...dadosAntes };
      if (antesLog.paciente_id && antesLog.paciente_nome) {
        antesLog.nome_paciente = antesLog.paciente_nome;
      }
      if (antesLog.aluno_id && antesLog.aluno_nome) {
        antesLog.nome_aluno = antesLog.aluno_nome;
      }
      if (antesLog.disciplina_id && antesLog.disciplina_nome) {
        antesLog.nome_disciplina = antesLog.disciplina_nome;
      }
      if (antesLog.auxiliar1_id && antesLog.auxiliar1_nome) {
        antesLog.nome_auxiliar1 = antesLog.auxiliar1_nome;
      }
      if (antesLog.auxiliar2_id && antesLog.auxiliar2_nome) {
        antesLog.nome_auxiliar2 = antesLog.auxiliar2_nome;
      }
      
      const depoisLog = { ...dados };
      if (nomesDepois.paciente_nome) {
        depoisLog.nome_paciente = nomesDepois.paciente_nome;
      }
      if (nomesDepois.aluno_nome) {
        depoisLog.nome_aluno = nomesDepois.aluno_nome;
      }
      if (nomesDepois.disciplina_nome) {
        depoisLog.nome_disciplina = nomesDepois.disciplina_nome;
      }
      if (nomesDepois.auxiliar1_nome) {
        depoisLog.nome_auxiliar1 = nomesDepois.auxiliar1_nome;
      }
      if (nomesDepois.auxiliar2_nome) {
        depoisLog.nome_auxiliar2 = nomesDepois.auxiliar2_nome;
      }

      // LOG (mostrando o antes e o depois)
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'atualizou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: JSON.stringify({
          antes: antesLog,
          depois: depoisLog
        })
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento atualizado!' });
    }

    if (req.user.role === 'aluno') {
      const [rows] = await conn.execute(
        'SELECT aluno_id, auxiliar1_id, auxiliar2_id FROM agendamentos WHERE id = ?',
        [id]
      );
      const permissoes = rows[0];

      if (
        !permissoes ||
        ![permissoes.aluno_id, permissoes.auxiliar1_id, permissoes.auxiliar2_id]
          .map(x => String(x))
          .includes(String(req.user.id))
      ) {
        conn.release();
        return res.status(403).json({ error: 'Não autorizado a atualizar este agendamento.' });
      }
      await Agendamento.atualizar(id, dados);

      // Prepara dados para o log incluindo nomes
      const antesLog = { ...dadosAntes };
      if (antesLog.paciente_id && antesLog.paciente_nome) {
        antesLog.nome_paciente = antesLog.paciente_nome;
      }
      if (antesLog.aluno_id && antesLog.aluno_nome) {
        antesLog.nome_aluno = antesLog.aluno_nome;
      }
      if (antesLog.disciplina_id && antesLog.disciplina_nome) {
        antesLog.nome_disciplina = antesLog.disciplina_nome;
      }
      if (antesLog.auxiliar1_id && antesLog.auxiliar1_nome) {
        antesLog.nome_auxiliar1 = antesLog.auxiliar1_nome;
      }
      if (antesLog.auxiliar2_id && antesLog.auxiliar2_nome) {
        antesLog.nome_auxiliar2 = antesLog.auxiliar2_nome;
      }
      
      const depoisLog = { ...dados };
      if (nomesDepois.paciente_nome) {
        depoisLog.nome_paciente = nomesDepois.paciente_nome;
      }
      if (nomesDepois.aluno_nome) {
        depoisLog.nome_aluno = nomesDepois.aluno_nome;
      }
      if (nomesDepois.disciplina_nome) {
        depoisLog.nome_disciplina = nomesDepois.disciplina_nome;
      }
      if (nomesDepois.auxiliar1_nome) {
        depoisLog.nome_auxiliar1 = nomesDepois.auxiliar1_nome;
      }
      if (nomesDepois.auxiliar2_nome) {
        depoisLog.nome_auxiliar2 = nomesDepois.auxiliar2_nome;
      }

      // LOG (mostrando o antes e o depois)
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'atualizou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: JSON.stringify({
          antes: antesLog,
          depois: depoisLog
        })
      });
      
      conn.release();

      return res.json({ mensagem: 'Agendamento atualizado!' });
    }
    return res.status(403).json({ error: 'Role não autorizado para atualizar agendamento.' });
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
};


// 5) DELETAR AGENDAMENTO
exports.deletarAgendamento = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Busca dados atuais antes de deletar
    const conn = await db.getConnection();
    const [dadosAntes] = await conn.execute(
      'SELECT * FROM agendamentos WHERE id = ?',
      [id]
    );

    // 2. Deleta normalmente conforme papel
    if (req.user.role === 'recepcao') {
      await Agendamento.deletar(id);

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'deletou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: dadosAntes[0] || {}
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    if (req.user.role === 'aluno') {
      if (dadosAntes.length === 0 || String(dadosAntes[0].aluno_id) !== String(req.user.id)) {
        conn.release();
        return res.status(403).json({ error: 'Não autorizado a deletar este agendamento.' });
      }
      await Agendamento.deletar(id);

      // LOG
      await Log.criar({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome,
        acao: 'deletou',
        entidade: 'agendamento',
        entidade_id: id,
        detalhes: dadosAntes[0] || {}
      });

      conn.release();
      return res.json({ mensagem: 'Agendamento deletado!' });
    }
    conn.release();
    return res.status(403).json({ error: 'Role não autorizado para deletar agendamento.' });
  } catch (err) {
    console.error('Erro ao deletar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao deletar agendamento.' });
  }
};

