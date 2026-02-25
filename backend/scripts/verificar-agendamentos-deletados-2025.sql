-- =============================================================================
-- Verificar se houve exclusão de agendamentos de 2025
-- O sistema registra em "logs" quem deletou e os dados completos do agendamento.
-- =============================================================================

-- 1) Listar todos os logs de exclusão de agendamento cuja data do agendamento
--    era em 2025 (detalhes é um JSON com o registro completo, incluindo "data").
SELECT
  l.id AS log_id,
  l.usuario_nome AS quem_deletou,
  l.criado_em AS quando_deletou,
  l.entidade_id AS agendamento_id_deletado,
  l.detalhes
FROM logs l
WHERE l.entidade = 'agendamento'
  AND l.acao = 'deletou'
  AND (
    l.detalhes LIKE '%"data":"2025-%'
    OR l.detalhes LIKE '%"data": "2025-%'
  )
ORDER BY l.criado_em DESC;

-- 2) Se o MySQL tiver suporte a JSON (5.7+), pode usar também:
-- SELECT id, usuario_nome, criado_em, entidade_id,
--        JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.data')) AS data_agendamento,
--        JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.paciente_id')) AS paciente_id,
--        JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.nome_paciente')) AS nome_paciente
-- FROM logs
-- WHERE entidade = 'agendamento' AND acao = 'deletou'
--   AND JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.data')) LIKE '2025-%'
-- ORDER BY criado_em DESC;
