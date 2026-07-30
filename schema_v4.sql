-- V4 Schema Updates para RH, Planejamento e Urgência

-- 1. Nova tabela de Pagamentos do RH
create table if not exists public.rh_pagamentos (
    id uuid default uuid_generate_v4() primary key,
    funcionario_id uuid references public.funcionarios(id) not null,
    dias_trabalhados integer not null,
    valor_diaria numeric(10, 2) not null,
    valor_extras numeric(10, 2) default 0,
    total_pago numeric(10, 2) not null,
    data_pagamento timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para rh_pagamentos (permitindo tudo via anon key para o MVP)
alter table public.rh_pagamentos enable row level security;
create policy "Allow public ALL on rh_pagamentos" on public.rh_pagamentos for all using (true) with check (true);

-- 2. Adicionar Nível de Urgência aos Orçamentos
alter table public.orcamentos_os 
add column if not exists urgencia text check (urgencia in ('Pouco Urgente', 'Urgente', 'Muito Urgente')) default 'Pouco Urgente';
