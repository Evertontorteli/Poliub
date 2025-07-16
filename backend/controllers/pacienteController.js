// controllers/pacienteController.js
const { getConnection } = require('../database');

exports.criarOuBuscarPaciente = async (req, res) => {
  const {
    nome, telefone, numero_prontuario,
    numero_gaveta, rg, cpf, data_nascimento,
    idade, cidade, endereco, numero, observacao
  } = req.body;
  try {
    const conn = await getConnection();
    // Tenta buscar pelo telefone
    const [results] = await conn.query(
      'SELECT * FROM pacientes WHERE telefone = ?',
      [telefone]
    );
    if (results.length > 0) {
      conn.release();
      return res.json(results[0]);
    }
    // Não existe, cria novo (incluindo numero_prontuario opcional)
    const [insertResult] = await conn.query(
      `INSERT INTO pacientes
        (nome, telefone, numero_prontuario, numero_gaveta, rg, cpf, data_nascimento,
         idade, cidade, endereco, numero, observacao)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nome,
        telefone,
        numero_prontuario || null,
        numero_gaveta || null,
        rg || null,
        cpf || null,
        data_nascimento || null,
        idade || null,
        cidade || null,
        endereco || null,
        numero || null,
        observacao || null
      ]
    );
    conn.release();
    res.status(201).json({
      id: insertResult.insertId,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null,
      numero_gaveta: numero_gaveta || null,
      rg: rg || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      idade: idade || null,
      cidade: cidade || null,
      endereco: endereco || null,
      numero: numero || null,
      observacao: observacao || null
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

exports.criarPaciente = async (req, res) => {
  const { nome, telefone, numero_prontuario } = req.body;
  try {
    const conn = await getConnection();
    const [insertResult] = await conn.query(
      'INSERT INTO pacientes (nome, telefone, numero_prontuario) VALUES (?, ?, ?)',
      [nome, telefone, numero_prontuario || null]
    );
    conn.release();
    res.status(201).json({
      id: insertResult.insertId,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar paciente', details: err });
  }
};

exports.atualizarPaciente = async (req, res) => {
  const { id } = req.params; // declare antes de usar
  const {
    nome, telefone, numero_prontuario,
    numero_gaveta, rg, cpf, data_nascimento,
    idade, cidade, endereco, numero, observacao
  } = req.body;
  
  // Agora você pode usar as variáveis aqui:
  console.log("ID recebendo update:", id, "Telefone:", telefone);

  try {
    const conn = await getConnection();

    // Busca outro paciente com o mesmo telefone e id diferente
    const [duplicados] = await conn.query(
      'SELECT id FROM pacientes WHERE telefone = ? AND id != ?',
      [telefone, id]
    );
    if (duplicados.length > 0) {
      conn.release();
      return res.status(400).json({ error: 'Já existe outro paciente com este telefone.' });
    }

    // Faz o update normalmente
    await conn.query(
      `UPDATE pacientes SET
         nome = ?, telefone = ?, numero_prontuario = ?, numero_gaveta = ?, rg = ?, cpf = ?,
         data_nascimento = ?, idade = ?, cidade = ?, endereco = ?, numero = ?, observacao = ?
       WHERE id = ?`,
      [
        nome,
        telefone,
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
        id
      ]
    );
    conn.release();
    res.json({
      id,
      nome,
      telefone,
      numero_prontuario: numero_prontuario || null,
      numero_gaveta: numero_gaveta || null,
      rg: rg || null,
      cpf: cpf || null,
      data_nascimento: data_nascimento || null,
      idade: idade || null,
      cidade: cidade || null,
      endereco: endereco || null,
      numero: numero || null,
      observacao: observacao || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar paciente', details: err });
  }
};


exports.deletarPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    await conn.query('DELETE FROM pacientes WHERE id = ?', [id]);
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
  } catch(err) {
    res.status(500).json({ error: 'Erro ao buscar histórico', details: err });
  }
};