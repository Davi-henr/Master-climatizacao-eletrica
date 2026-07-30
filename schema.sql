-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clientes
create table public.clientes (
    id uuid default uuid_generate_v4() primary key,
    nome text not null,
    telefone_whatsapp text,
    endereco text,
    data_cadastro timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Equipamentos
create table public.equipamentos (
    id uuid default uuid_generate_v4() primary key,
    cliente_id uuid references public.clientes(id) on delete cascade not null,
    descricao text not null,
    local text
);

-- Tabela de Preços (Serviços e Peças)
create table public.tabela_precos (
    id uuid default uuid_generate_v4() primary key,
    nome_item text not null,
    tipo text check (tipo in ('servico', 'peca')) not null,
    valor_padrao numeric(10, 2) not null
);

-- Funcionários (Equipe/Técnicos)
create table public.funcionarios (
    id uuid default uuid_generate_v4() primary key,
    nome text not null,
    cargo text not null,
    valor_diaria numeric(10, 2) not null
);

-- Orçamentos e Ordens de Serviço
create table public.orcamentos_os (
    id uuid default uuid_generate_v4() primary key,
    cliente_id uuid references public.clientes(id) not null,
    equipamento_id uuid references public.equipamentos(id),
    status text check (status in ('orcamento_pendente', 'os_ativa', 'os_finalizada')) default 'orcamento_pendente' not null,
    data_agendamento timestamp with time zone,
    tecnico_id uuid references public.funcionarios(id),
    valor_total numeric(10, 2) default 0 not null,
    observacoes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Itens da O.S. / Orçamento
create table public.itens_os (
    id uuid default uuid_generate_v4() primary key,
    os_id uuid references public.orcamentos_os(id) on delete cascade not null,
    item_id uuid references public.tabela_precos(id) not null,
    quantidade integer default 1 not null,
    valor_unitario numeric(10, 2) not null,
    subtotal numeric(10, 2) not null
);

-- Dias Trabalhados (RH)
create table public.dias_trabalhados (
    id uuid default uuid_generate_v4() primary key,
    funcionario_id uuid references public.funcionarios(id) on delete cascade not null,
    data_trabalho date not null,
    pago boolean default false not null,
    unique(funcionario_id, data_trabalho)
);

-- Financeiro (Fluxo de Caixa)
create table public.financeiro (
    id uuid default uuid_generate_v4() primary key,
    tipo text check (tipo in ('receita', 'despesa')) not null,
    categoria text check (categoria in ('servico', 'combustivel', 'peca', 'folha_pagamento', 'outros')) not null,
    valor numeric(10, 2) not null,
    data_lancamento timestamp with time zone default timezone('utc'::text, now()) not null,
    descricao text not null
);

-- Policies (RLS) - Permitindo tudo temporariamente para o MVP (anon key usage)
-- OBS: Em produção, o ideal é usar Roles ou Auth Users. Como você pediu sem autenticação, vamos abrir o acesso para a anon key.

alter table public.clientes enable row level security;
create policy "Allow public ALL on clientes" on public.clientes for all using (true) with check (true);

alter table public.equipamentos enable row level security;
create policy "Allow public ALL on equipamentos" on public.equipamentos for all using (true) with check (true);

alter table public.tabela_precos enable row level security;
create policy "Allow public ALL on tabela_precos" on public.tabela_precos for all using (true) with check (true);

alter table public.funcionarios enable row level security;
create policy "Allow public ALL on funcionarios" on public.funcionarios for all using (true) with check (true);

alter table public.orcamentos_os enable row level security;
create policy "Allow public ALL on orcamentos_os" on public.orcamentos_os for all using (true) with check (true);

alter table public.itens_os enable row level security;
create policy "Allow public ALL on itens_os" on public.itens_os for all using (true) with check (true);

alter table public.dias_trabalhados enable row level security;
create policy "Allow public ALL on dias_trabalhados" on public.dias_trabalhados for all using (true) with check (true);

alter table public.financeiro enable row level security;
create policy "Allow public ALL on financeiro" on public.financeiro for all using (true) with check (true);
