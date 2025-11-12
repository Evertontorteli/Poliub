// backend/controllers/searchController.js
const pool = require('../database');

async function buscaGlobal(req, res) {
  const termo = req.query.q;
  if (!termo) return res.json({ alunos: [], pacientes: [], disciplinas: [] });

  const conn = await pool.getConnection();
  try {
    // Detecta busca específica por prontuário: "p" seguido de números (ex: "p511", "P123")
    const prontuarioMatch = termo.match(/^p(\d+)$/i);
    const isBuscaProntuario = prontuarioMatch !== null;
    const numeroProntuario = isBuscaProntuario ? prontuarioMatch[1] : null;
    
    // Detecta busca específica por box: "b" seguido de números (ex: "b84", "B123")
    const boxMatch = termo.match(/^b(\d+)$/i);
    const isBuscaBox = boxMatch !== null;
    const numeroBox = isBuscaBox ? boxMatch[1] : null;
    
    // Normaliza o termo: remove espaços extras e trim
    const termoNormalizado = termo.trim().replace(/\s+/g, ' ');
    // Busca precisa: apenas resultados que começam com o termo digitado
    const termoPatternStart = `${termoNormalizado}%`;
    const termoCpf = termo.replace(/\D/g, ''); // Remove não-dígitos para busca de CPF
    const termoNumerico = termo.replace(/\D/g, ''); // Remove não-dígitos para busca numérica (RA, PIN, telefone)
    
    // Detecta se o termo é apenas numérico (para buscar apenas em campos numéricos)
    const isTermoNumerico = /^\d+$/.test(termoNormalizado);
    // Se não é numérico e tem pelo menos uma letra, considera como texto
    const isTermoAlfanumerico = !isTermoNumerico && /[a-zA-ZÀ-ÿ]/.test(termoNormalizado);
    
    // Se for busca específica por prontuário, busca apenas nesse campo
    if (isBuscaProntuario) {
      const prontuarioPattern = `%${numeroProntuario}%`;
      
      // Busca apenas pacientes por prontuário
      const [pacientes] = await conn.execute(
        `SELECT id, nome, cpf, telefone, responsavel_telefone, numero_prontuario
         FROM pacientes 
         WHERE numero_prontuario LIKE ? OR CAST(numero_prontuario AS CHAR) LIKE ?
         LIMIT 20`,
        [prontuarioPattern, prontuarioPattern]
      );
      
      return res.json({ 
        alunos: [], 
        pacientes, 
        disciplinas: []
      });
    }
    
    // Se for busca específica por box, busca apenas alunos com esse box
    if (isBuscaBox) {
      const boxPattern = `%${numeroBox}%`;
      
      // Busca apenas alunos por box
      const [alunos] = await conn.execute(
        `SELECT DISTINCT
           a.id, 
           a.nome, 
           a.usuario,
           a.ra,
           a.pin,
           b.conteudo AS box
         FROM alunos a
         LEFT JOIN boxes b ON a.id = b.aluno_id
         WHERE b.conteudo LIKE ?
         LIMIT 20`,
        [boxPattern]
      );
      
      return res.json({ 
        alunos, 
        pacientes: [], 
        disciplinas: []
      });
    }
    
    // Busca case-insensitive em alunos (nome, usuário, RA, PIN) e box
    // Busca precisa: apenas resultados que começam com o termo digitado
    let alunosQuery = '';
    let alunosParams = [];
    
    if (isTermoAlfanumerico) {
      // Apenas texto: busca apenas em nome e usuário
      alunosQuery = `SELECT DISTINCT
         a.id, 
         a.nome, 
         a.usuario,
         a.ra,
         a.pin,
         b.conteudo AS box
       FROM alunos a
       LEFT JOIN boxes b ON a.id = b.aluno_id
       WHERE (a.nome IS NOT NULL AND LOWER(a.nome) LIKE LOWER(?))
          OR (a.usuario IS NOT NULL AND LOWER(a.usuario) LIKE LOWER(?))
          OR (b.conteudo IS NOT NULL AND b.conteudo LIKE ?)
       LIMIT 20`;
      alunosParams = [termoPatternStart, termoPatternStart, termoPatternStart];
    } else if (isTermoNumerico) {
      // Apenas números: busca apenas em RA, PIN (busca parcial para encontrar em qualquer parte do número)
      const termoPatternNumeric = `%${termoNumerico}%`;
      alunosQuery = `SELECT DISTINCT
         a.id, 
         a.nome, 
         a.usuario,
         a.ra,
         a.pin,
         b.conteudo AS box
       FROM alunos a
       LEFT JOIN boxes b ON a.id = b.aluno_id
       WHERE (a.ra IS NOT NULL AND a.ra LIKE ?)
          OR (a.pin IS NOT NULL AND a.pin LIKE ?)
       LIMIT 20`;
      alunosParams = [termoPatternNumeric, termoPatternNumeric];
    } else {
      // Misto: busca em nome/usuário (começa com) e campos numéricos (busca parcial)
      const termoPatternNumeric = termoNumerico ? `%${termoNumerico}%` : termoPatternStart;
      alunosQuery = `SELECT DISTINCT
         a.id, 
         a.nome, 
         a.usuario,
         a.ra,
         a.pin,
         b.conteudo AS box
       FROM alunos a
       LEFT JOIN boxes b ON a.id = b.aluno_id
       WHERE (a.nome IS NOT NULL AND LOWER(a.nome) LIKE LOWER(?))
          OR (a.usuario IS NOT NULL AND LOWER(a.usuario) LIKE LOWER(?))
          OR (a.ra IS NOT NULL AND a.ra LIKE ?)
          OR (a.pin IS NOT NULL AND a.pin LIKE ?)
          OR (b.conteudo IS NOT NULL AND b.conteudo LIKE ?)
       LIMIT 20`;
      alunosParams = [termoPatternStart, termoPatternStart, termoPatternNumeric, termoPatternNumeric, termoPatternStart];
    }
    
    const [alunos] = await conn.execute(alunosQuery, alunosParams);
    
    // Busca case-insensitive em pacientes (nome, CPF, telefone, responsavel_telefone, prontuário)
    // Busca precisa: apenas resultados que começam com o termo digitado
    // Se for texto, busca apenas em nome. Se for numérico, busca apenas em campos numéricos.
    let pacientesQuery = '';
    let pacientesParams = [];
    
    if (isTermoAlfanumerico) {
      // Apenas texto: busca apenas em nome
      pacientesQuery = `SELECT id, nome, cpf, telefone, responsavel_telefone, numero_prontuario
       FROM pacientes 
       WHERE LOWER(nome) LIKE LOWER(?)
       LIMIT 20`;
      pacientesParams = [termoPatternStart];
    } else if (isTermoNumerico) {
      // Apenas números: busca apenas em campos numéricos (busca parcial para encontrar em qualquer parte do número)
      const termoPatternNumeric = `%${termoNumerico}%`;
      pacientesQuery = `SELECT id, nome, cpf, telefone, responsavel_telefone, numero_prontuario
       FROM pacientes 
       WHERE (cpf IS NOT NULL AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') LIKE ?)
          OR (telefone IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?)
          OR (responsavel_telefone IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(responsavel_telefone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?)
          OR (numero_prontuario IS NOT NULL AND CAST(numero_prontuario AS CHAR) LIKE ?)
       LIMIT 20`;
      pacientesParams = [
        termoPatternNumeric,
        termoPatternNumeric,
        termoPatternNumeric,
        termoPatternNumeric
      ];
    } else {
      // Misto: busca em nome (começa com) e campos numéricos (busca parcial)
      const termoPatternNumeric = termoNumerico ? `%${termoNumerico}%` : termoPatternStart;
      pacientesQuery = `SELECT id, nome, cpf, telefone, responsavel_telefone, numero_prontuario
       FROM pacientes 
       WHERE LOWER(nome) LIKE LOWER(?)
          OR (cpf IS NOT NULL AND REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') LIKE ?)
          OR (telefone IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?)
          OR (responsavel_telefone IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(responsavel_telefone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?)
          OR (numero_prontuario IS NOT NULL AND CAST(numero_prontuario AS CHAR) LIKE ?)
       LIMIT 20`;
      pacientesParams = [
        termoPatternStart,
        termoPatternNumeric,
        termoPatternNumeric,
        termoPatternNumeric,
        termoPatternNumeric
      ];
    }
    
    const [pacientes] = await conn.execute(pacientesQuery, pacientesParams);
    
    // Busca case-insensitive em disciplinas
    // Busca precisa: apenas resultados que começam com o termo digitado
    const [disciplinas] = await conn.execute(
      `SELECT id, nome 
       FROM disciplinas 
       WHERE LOWER(nome) LIKE LOWER(?)
       LIMIT 20`,
      [termoPatternStart]
    );
    
    res.json({ alunos, pacientes, disciplinas });
  } catch (err) {
    console.error('Erro na busca global:', err);
    res.status(500).json({ error: 'Erro ao pesquisar', details: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { buscaGlobal };
