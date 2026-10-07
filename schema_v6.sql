-- V6 Schema Updates

-- Adiciona a coluna meses_proxima_higienizacao na tabela orcamentos_os, por padrao 6 meses.
alter table public.orcamentos_os 
add column if not exists meses_proxima_higienizacao integer default 6;
