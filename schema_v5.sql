-- Adiciona coluna de senha na tabela de funcionários para permitir acesso ao sistema
-- A senha padrão será '123456' para todos os registros novos e existentes
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT '123456';
