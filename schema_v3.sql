-- V3 Schema Updates para Multi-Equipamentos e Flexibilidade

-- 1. Transferir equipamento e tipo de servico do orçamento (Header) para os itens (Linhas)
-- Adiciona na tabela de itens o equipamento exato e o tipo de servico (Instalação, Limpeza, etc)
alter table public.itens_os 
add column if not exists equipamento_id uuid references public.equipamentos(id),
add column if not exists tipo_servico text;

-- 2. Limpar cache da configuracao caso a imagem esteja muito grande
delete from public.configuracoes where chave = 'logo_base64';

-- OBSERVAÇÃO: A coluna equipamento_id original na orcamentos_os pode ficar nula agora, 
-- pois a informação de equipamento estará atrelada aos itens.
alter table public.orcamentos_os alter column equipamento_id drop not null;
