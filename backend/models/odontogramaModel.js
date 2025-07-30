const { getConnection } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Busca odontograma de um paciente (todos dentes)
async function findByPaciente(paciente_id) {
  const conn = await getConnection();
  const [rows] = await conn.query(
    'SELECT * FROM odontogramas WHERE paciente_id = ? ORDER BY dente ASC',
    [paciente_id]
  );
  conn.release();
  // faces (JSON) já parseadas
  return rows.map(row => ({
    ...row,
    faces: typeof row.faces === 'string' ? JSON.parse(row.faces) : row.faces
  }));
}

// Salva (insere ou atualiza) um dente do odontograma
async function upsert({ paciente_id, dente, faces, tipo_dente, alterado_por }) {
  const conn = await getConnection();
  // Verifica se já existe esse dente/paciente
  const [existe] = await conn.query(
    'SELECT id FROM odontogramas WHERE paciente_id = ? AND dente = ?',
    [paciente_id, dente]
  );
  let id = existe[0]?.id || uuidv4();
  const facesStr = JSON.stringify(faces);

  if (existe.length > 0) {
    await conn.query(
      `UPDATE odontogramas
       SET faces = ?, tipo_dente = ?, alterado_por = ?, atualizado_em = NOW()
       WHERE id = ?`,
      [facesStr, tipo_dente, alterado_por, id]
    );
  } else {
    await conn.query(
      `INSERT INTO odontogramas (id, paciente_id, dente, faces, tipo_dente, alterado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, paciente_id, dente, facesStr, tipo_dente, alterado_por]
    );
  }
  conn.release();
  return { id, paciente_id, dente, faces, tipo_dente, alterado_por };
}

module.exports = { findByPaciente, upsert };
