-- Migração: coluna ativo na tabela alunos (1 = ativo, 0 = desativado).
-- Execute este SQL uma vez no banco local e no Railway (produção).
-- No MySQL: source scripts/add-ativo-alunos.sql   ou copie e cole no cliente.

ALTER TABLE alunos
ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1;
