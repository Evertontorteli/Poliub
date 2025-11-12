// controllers/pacienteController.js
const { getConnection } = require('../database');
const Log = require('../models/logModel.js');


exports.criarOuBuscarPaciente = async (req, res) => {
  const {
    nome, telefone, numero_prontuario,
    numero_gaveta, rg, cpf, data_nascimento,
    idade, cidade, endereco, numero, observacao,
    tipo_paciente, responsavel_nome, responsavel_telefone
  } = req.body;
  try {
    const conn = await getConnection();
    const tipo = (tipo_paciente || 'NORMAL').toUpperCase();

    // Normaliza telefones (podem ser opcionais para tipos não-NORMAL)
    const telDigits = (telefone || '').replace(/\D/g, '');
    const telRespDigits = (responsavel_telefone || '').replace(/\D/g, '');

    // Validação: para NORMAL, telefone obrigatório com 10 ou 11 dígitos
    if (tipo === 'NORMAL') {
      if (!telDigits || (telDigits.length !== 10 && telDigits.length !== 11)) {
        conn.release();
        return res.status(400).json({ error: 'Telefone obrigatório para pacientes do tipo NORMAL (10 ou 11 dígitos).' });
      }
    } else {
      // Para tipos não-NORMAL, se informado, validar formato
      if (telDigits && telDigits.length !== 10 && telDigits.length !== 11) {
        conn.release();
        return res.status(400).json({ error: 'Telefone inválido. Use 10 ou 11 dígitos.' });
      }
      if (telRespDigits && telRespDigits.length !== 10 && telRespDigits.length !== 11) {
        conn.release();
        return res.status(400).json({ error: 'Telefone do responsável inválido. Use 10 ou 11 dígitos.' });
      }
    }

    // Tenta buscar pelo telefone se houver telefone informado
    if (telDigits) {
      const [results] = await conn.query(
        'SELECT * FROM pacientes WHERE telefone = ?',
        [telDigits]
      );
      if (results.length > 0) {
        conn.release();
        return res.json(results[0]);
      }
    }
    // Não existe, cria novo (incluindo numero_prontuario opcional)
    const [insertResult] = await conn.query(
      `INSERT INTO pacientes
        (nome, telefone, numero_prontuario, numero_gaveta, rg, cpf, data_nascimento,
         idade, cidade, endereco, numero, observacao, tipo_paciente, responsavel_nome, responsavel_telefone)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nome,
        telDigits || null,
        numero_prontuario || null,
        numero_gaveta || null,
        rg || null,
        cpf || null,
        data_nascimento || null,
        idade || null,
        cidade || null,
        endereco || null,
        numero || null,
        observacao || null,
        tipo,
        responsavel_nome || null,
        (telRespDigits || null)
      ]
    );
        // ==== CRIE O LOG AQUI ====
    await Log.criar({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'criou',
      entidade: 'paciente',
      entidade_id: insertResult.insertId,
      detalhes: {
        nome,
        telefone: telDigits || null,
        numero_prontuario, numero_gaveta, rg, cpf,
        data_nascimento, idade, cidade, endereco, numero, observacao,
        tipo_paciente: tipo,
        responsavel_nome: responsavel_nome || null,
        responsavel_telefone: telRespDigits || null
      }
    });
    
    conn.release();
    res.status(201).json({
      id: insertResult.insertId,
      nome,
      telefone: telDigits || null,
      numero_prontuario: numero_prontuario || null,
      numero_gaveta: numero_gaveta || null,
      rg: rg || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      idade: idade || null,
      cidade: cidade || null,
      endereco: endereco || null,
      numero: numero || null,
      observacao: observacao || null,
      tipo_paciente: tipo,
      responsavel_nome: responsavel_nome || null,
      responsavel_telefone: telRespDigits || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar ou buscar paciente', details: err });
  }
};

exports.listarPacientes = async (req, res) => {
  try {
    const conn = await getConnection();
    let rows;
    if (req.query.telefone) {
      [rows] = await conn.query('SELECT * FROM pacientes WHERE telefone = ?', [req.query.telefone]);
    } else {
      [rows] = await conn.query('SELECT * FROM pacientes');
    }
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pacientes', details: err });
  }
};

// Buscar paciente por ID
exports.buscarPacientePorId = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM pacientes WHERE id = ?', [id]);
    conn.release();
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar paciente', details: err });
  }
};

exports.criarPaciente = async (req, res) => {
  const {
    nome, telefone, numero_prontuario, numero_gaveta, rg, cpf,
    data_nascimento, idade, cep, endereco, numero, bairro, cidade, uf, observacao,
    tipo_paciente, responsavel_nome, responsavel_telefone
  } = req.body;
  
  try {
    const result = await Paciente.inserir({
      nome,
      telefone,
      numero_prontuario,
      numero_gaveta,
      rg,
      cpf,
      data_nascimento,
      idade,
      cep,
      endereco,
      numero,
      bairro,
      cidade,
      uf,
      observacao,
      tipo_paciente,
      responsavel_nome,
      responsavel_telefone
    });

    // LOG de criação:
    await Log.criar({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'criou',
      entidade: 'paciente',
      entidade_id: result.insertId,
      detalhes: JSON.stringify({
        nome, telefone, numero_prontuario, numero_gaveta, rg, cpf,
        data_nascimento, idade, cep, endereco, numero, bairro, cidade, uf, observacao,
        tipo_paciente, responsavel_nome, responsavel_telefone
      })
    });

    res.status(201).json({
      id: result.insertId,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null
    });
  } catch (err) {
    console.error('Erro ao criar paciente:', err);
    res.status(500).json({ error: 'Erro ao criar paciente', details: err.message });
  }
};

exports.atualizarPaciente = async (req, res) => {
  const { id } = req.params;
  const {
    nome, telefone, numero_prontuario,
    numero_gaveta, rg, cpf, data_nascimento,
    idade, cep, endereco, numero, bairro, cidade, uf, observacao,
    tipo_paciente, responsavel_nome, responsavel_telefone
  } = req.body;

  // Agora você pode usar as variáveis aqui:
  console.log("ID recebendo update:", id, "Telefone:", telefone);

  try {
    const conn = await getConnection();

    // Busca o estado atual do paciente ANTES de alterar (para o log)
    const [antesRows] = await conn.query(
      'SELECT * FROM pacientes WHERE id = ?',
      [id]
    );
    const dadosAntes = antesRows[0] || null;

    const tipo = (tipo_paciente || 'NORMAL').toUpperCase();
    const telDigits = (telefone || '').replace(/\D/g, '');
    const telRespDigits = (responsavel_telefone || '').replace(/\D/g, '');

    // Validação
    if (tipo === 'NORMAL') {
      if (!telDigits || (telDigits.length !== 10 && telDigits.length !== 11)) {
        conn.release();
        return res.status(400).json({ error: 'Telefone obrigatório para pacientes do tipo NORMAL (10 ou 11 dígitos).' });
      }
    } else {
      if (telDigits && telDigits.length !== 10 && telDigits.length !== 11) {
        conn.release();
        return res.status(400).json({ error: 'Telefone inválido. Use 10 ou 11 dígitos.' });
      }
      if (telRespDigits && telRespDigits.length !== 10 && telRespDigits.length !== 11) {
        conn.release();
        return res.status(400).json({ error: 'Telefone do responsável inválido. Use 10 ou 11 dígitos.' });
      }
    }

    // Busca outro paciente com o mesmo telefone e id diferente (só se houver telefone)
    if (telDigits) {
      const [duplicados] = await conn.query(
        'SELECT id FROM pacientes WHERE telefone = ? AND id != ?',
        [telDigits, id]
      );
      if (duplicados.length > 0) {
        conn.release();
        return res.status(400).json({ error: 'Já existe outro paciente com este telefone.' });
      }
    }

    // Faz o update normalmente
    await conn.query(
      `UPDATE pacientes SET
         nome = ?, telefone = ?, numero_prontuario = ?, numero_gaveta = ?, rg = ?, cpf = ?,
         data_nascimento = ?, idade = ?, cep = ?, endereco = ?, numero = ?, bairro = ?, cidade = ?, uf = ?, observacao = ?,
         tipo_paciente = ?, responsavel_nome = ?, responsavel_telefone = ?
       WHERE id = ?`,
      [
        nome,
        telDigits || null,
        numero_prontuario || null,
        numero_gaveta || null,
        rg || null,
        cpf || null,
        data_nascimento || null,
        idade || null,
        cep || null,
        endereco || null,
        numero || null,
        bairro || null,
        cidade || null,
        uf || null,
        observacao || null,
        (tipo || 'NORMAL'),
        responsavel_nome || null,
        (telRespDigits || null),
        id
      ]
    );

    // Prepara dados para o log (antes e depois)
    const dadosDepois = {
      nome,
      telefone: telDigits || null,
      numero_prontuario: numero_prontuario || null,
      numero_gaveta: numero_gaveta || null,
      rg: rg || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      idade: idade || null,
      cep: cep || null,
      endereco: endereco || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
      observacao: observacao || null,
      tipo_paciente: tipo,
      responsavel_nome: responsavel_nome || null,
      responsavel_telefone: telRespDigits || null
    };

    // LOG de atualização (mostrando o antes e o depois)
    await Log.criar({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'atualizou',
      entidade: 'paciente',
      entidade_id: id,
      detalhes: JSON.stringify({
        antes: dadosAntes,
        depois: dadosDepois
      })
    });

    conn.release();
    res.json({
      id,
      nome,
      telefone: telDigits || null,
      numero_prontuario: numero_prontuario || null,
      numero_gaveta: numero_gaveta || null,
      rg: rg || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      idade: idade || null,
      cidade: cidade || null,
      endereco: endereco || null,
      numero: numero || null,
      observacao: observacao || null,
      tipo_paciente: (tipo || 'NORMAL'),
      responsavel_nome: responsavel_nome || null,
      responsavel_telefone: telRespDigits || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar paciente', details: err });
  }
};


//DELETAR PACIENTE
exports.deletarPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    // BUSCA OS DADOS ANTES DE DELETAR para logar snapshot
    const [dados] = await conn.query('SELECT * FROM pacientes WHERE id = ?', [id]);
    await conn.query('DELETE FROM pacientes WHERE id = ?', [id]);

    // LOG de exclusão
    await Log.criar({
      usuario_id: req.user.id,
      usuario_nome: req.user.nome,
      acao: 'deletou',
      entidade: 'paciente',
      entidade_id: id,
      detalhes: dados[0] || {}
    });

    conn.release();
    res.send('Paciente deletado!');
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar paciente', details: err });
  }
};


exports.historicoPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    const [rows] = await conn.query(
      'SELECT * FROM historico_pacientes WHERE paciente_id = ?',
      [id]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico', details: err });
  }
};