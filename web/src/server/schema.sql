create table if not exists users (
    id text primary key,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists sessions (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_expires_at on sessions(expires_at);

create table if not exists model_channels (
    id text primary key,
    user_id text references users(id) on delete cascade,
    scope text not null check (scope in ('cloud_personal', 'system')),
    name text not null,
    base_url text not null,
    api_format text not null,
    models jsonb not null default '[]'::jsonb,
    encrypted_api_key text not null,
    enabled boolean not null default true,
    max_concurrency integer not null default 2,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_model_channels_user_id on model_channels(user_id);
create index if not exists idx_model_channels_scope on model_channels(scope);

create table if not exists generation_tasks (
    id text primary key,
    user_id text references users(id) on delete set null,
    type text not null check (type in ('image', 'video', 'audio')),
    status text not null check (status in ('queued', 'running', 'succeeded', 'partial_failed', 'failed', 'cancelled')),
    channel_id text references model_channels(id) on delete set null,
    prompt text not null,
    config jsonb not null default '{}'::jsonb,
    references jsonb not null default '[]'::jsonb,
    total_count integer not null default 1,
    success_count integer not null default 0,
    fail_count integer not null default 0,
    idempotency_key text,
    error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    finished_at timestamptz
);

create unique index if not exists idx_generation_tasks_user_id_idempotency_key
    on generation_tasks(user_id, idempotency_key)
    where idempotency_key is not null;

create index if not exists idx_generation_tasks_user_id_created_at on generation_tasks(user_id, created_at desc);
create index if not exists idx_generation_tasks_status on generation_tasks(status);

create table if not exists generation_task_items (
    id text primary key,
    task_id text not null references generation_tasks(id) on delete cascade,
    item_index integer not null,
    status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    storage_provider text,
    storage_bucket text,
    storage_region text,
    storage_key text,
    result_url text,
    mime_type text,
    width integer,
    height integer,
    bytes integer,
    sha256 text,
    retry_count integer not null default 0,
    error text,
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(task_id, item_index)
);

create index if not exists idx_generation_task_items_task_id on generation_task_items(task_id);
create index if not exists idx_generation_task_items_status on generation_task_items(status);

