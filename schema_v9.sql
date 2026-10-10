-- V9 Schema Updates

-- Adiciona a coluna tecnicos_ids na tabela orcamentos_os para permitir múltiplos técnicos na mesma OS
alter table public.orcamentos_os 
add column if not exists tecnicos_ids uuid[] default '{}'::uuid[];
