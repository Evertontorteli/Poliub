-- =============================================================================
-- Migração: adicionar coluna "ativo" na tabela disciplinas
-- 1 = ativa (padrão), 0 = desativada
-- =============================================================================

ALTER TABLE disciplinas
  ADD COLUMN IF NOT EXISTS ativo TINYINT(1) NOT NULL DEFAULT 1;

-- Se o MySQL não suportar IF NOT EXISTS em ADD COLUMN, rode:
-- ALTER TABLE disciplinas ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1;
