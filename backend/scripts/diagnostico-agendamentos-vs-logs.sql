-- =============================================================================
-- Diagnóstico: por que agendamentos "sumiram" se no log tem criação?
-- Compara a tabela agendamentos com os logs de "criou" e "deletou".
-- =============================================================================

-- 1) Total de agendamentos HOJE na tabela
SELECT 'Agendamentos na tabela' AS descricao, COUNT(*) AS total FROM agendamentos;

-- 2) Total de registros no log: "criou" agendamento
SELECT 'Logs de CRIAÇÃO (criou agendamento)' AS descricao, COUNT(*) AS total
FROM logs
WHERE entidade = 'agendamento' AND acao = 'criou';

-- 3) Total de registros no log: "deletou" agendamento
SELECT 'Logs de EXCLUSÃO (deletou agendamento)' AS descricao, COUNT(*) AS total
FROM logs
WHERE entidade = 'agendamento' AND acao = 'deletou';

-- 4) IDs que constam como CRIADOS no log mas NÃO existem mais na tabela
--    (foram deletados depois, ou você está em outro banco que não recebeu os inserts)
SELECT l.entidade_id AS id_criado_no_log,
       l.usuario_nome AS quem_criou,
       l.criado_em AS quando_criou,
       l.detalhes
FROM logs l
WHERE l.entidade = 'agendamento'
  AND l.acao = 'criou'
  AND NOT EXISTS (SELECT 1 FROM agendamentos a WHERE a.id = l.entidade_id)
ORDER BY l.criado_em DESC
LIMIT 100;

-- 5) Resumo por ano (na tabela agendamentos)
SELECT SUBSTRING(a.data, 1, 4) AS ano, COUNT(*) AS total
FROM agendamentos a
WHERE a.data IS NOT NULL
GROUP BY SUBSTRING(a.data, 1, 4)
ORDER BY ano DESC;
