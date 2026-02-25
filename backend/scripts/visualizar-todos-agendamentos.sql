-- =============================================================================
-- Visualizar todos os agendamentos
-- Ordenado por data (mais recentes primeiro) e hora.
-- =============================================================================

SELECT
  a.id,
  a.data,
  a.hora,
  a.status,
  COALESCE(p.nome, a.nome_paciente, '-') AS paciente,
  op.nome AS operador,
  aux.nome AS auxiliar1,
  aux2.nome AS auxiliar2,
  d.nome AS disciplina,
  COALESCE(a.telefone, p.telefone) AS telefone
FROM agendamentos a
LEFT JOIN alunos op   ON a.aluno_id     = op.id
LEFT JOIN alunos aux  ON a.auxiliar1_id  = aux.id
LEFT JOIN alunos aux2 ON a.auxiliar2_id  = aux2.id
LEFT JOIN disciplinas d ON a.disciplina_id = d.id
LEFT JOIN pacientes p  ON a.paciente_id   = p.id
ORDER BY a.data DESC, a.hora ASC, a.id DESC;


-- =============================================================================
-- Opcional: mesma lista com data em DD/MM/AAAA
-- =============================================================================
-- SELECT
--   a.id,
--   DATE_FORMAT(a.data, '%d/%m/%Y') AS data_br,
--   a.hora,
--   a.status,
--   COALESCE(p.nome, a.nome_paciente, '-') AS paciente,
--   op.nome AS operador,
--   d.nome AS disciplina
-- FROM agendamentos a
-- LEFT JOIN alunos op ON a.aluno_id = op.id
-- LEFT JOIN disciplinas d ON a.disciplina_id = d.id
-- LEFT JOIN pacientes p ON a.paciente_id = p.id
-- ORDER BY a.data DESC, a.hora ASC;


-- =============================================================================
-- Opcional: resumo por ano/mês
-- =============================================================================
-- SELECT
--   SUBSTRING(a.data, 1, 7) AS ano_mes,
--   COUNT(*) AS total
-- FROM agendamentos a
-- GROUP BY SUBSTRING(a.data, 1, 7)
-- ORDER BY ano_mes DESC;
