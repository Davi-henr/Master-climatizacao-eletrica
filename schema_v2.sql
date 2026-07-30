-- V2 Schema Updates for Master Climatização e Eletrica

-- 1. Nova Tabela de Configurações (para armazenar a logo em Base64 e outras configs)
create table if not exists public.configuracoes (
    id uuid default uuid_generate_v4() primary key,
    chave text not null unique,
    valor text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.configuracoes enable row level security;
create policy "Allow public ALL on configuracoes" on public.configuracoes for all using (true) with check (true);


-- 2. Novas Colunas em orcamentos_os
-- tipo_servico: Identifica a cor no calendário (ex: 'Instalação', 'Limpeza', 'Reparo')
alter table public.orcamentos_os 
add column if not exists tipo_servico text default 'Instalação';


-- 3. Nova Coluna em itens_os
-- tipo_custo: Para separar Materiais de Mão de Obra no PDF
alter table public.itens_os 
add column if not exists tipo_custo text check (tipo_custo in ('material', 'mao_de_obra')) default 'mao_de_obra';


-- 4. Inserir logo padrão vazia (opcional)
insert into public.configuracoes (chave, valor) values ('logo_base64', '') on conflict (chave) do nothing;
