-- V10 Schema Updates

-- Adiciona os_id no financeiro para vincular as receitas/despesas à OS e facilitar reversões
alter table public.financeiro 
add column if not exists os_id uuid references public.orcamentos_os(id) on delete cascade;
