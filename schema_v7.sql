-- V7 Schema Updates

-- Adiciona a coluna notificacao_enviada na tabela orcamentos_os para controlar o envio no sininho
alter table public.orcamentos_os 
add column if not exists notificacao_enviada boolean default false;
