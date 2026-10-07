-- V8 Schema Updates

-- Adiciona a coluna custo_materiais_informado na tabela orcamentos_os para armazenar o custo real informado na finalizacao
alter table public.orcamentos_os 
add column if not exists custo_materiais_informado numeric(10, 2) default 0;
