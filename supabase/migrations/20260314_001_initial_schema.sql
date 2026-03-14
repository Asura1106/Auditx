create extension if not exists pgcrypto;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_category text not null,
  file_description text,
  file_type text,
  file_size bigint default 0,
  file_path text,
  file_bucket text,
  student_name text,
  student_record_type text,
  department text not null check (department in ('CSE', 'IT', 'ALL')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'system_rejected')),
  uploaded_by text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_settings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.document_features (
  document_id uuid primary key references public.files(id) on delete cascade,
  header_ok boolean not null default false,
  circular_ok boolean not null default false,
  minutes_ok boolean not null default false,
  agenda_count integer not null default 0,
  discussion_rows integer not null default 0,
  subject_count integer not null default 0,
  subject_code_order_hash text not null default '',
  progressive_text text not null default '',
  content_fingerprint text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.verification_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.files(id) on delete cascade,
  compared_document_id uuid references public.files(id) on delete set null,
  progression_similarity double precision not null default 0,
  risk_score integer not null default 0,
  risk_level text not null default 'PASS' check (risk_level in ('PASS', 'SOFT_FLAG', 'STRONG_FLAG')),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_files_user_id on public.files(user_id);
create index if not exists idx_files_department on public.files(department);
create index if not exists idx_files_status on public.files(status);
create index if not exists idx_files_category on public.files(file_category);
create index if not exists idx_files_uploaded_at on public.files(uploaded_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_verification_results_document_id on public.verification_results(document_id);

alter table public.files enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_settings enable row level security;
alter table public.document_features enable row level security;
alter table public.verification_results enable row level security;

drop policy if exists files_select_role_based on public.files;
create policy files_select_role_based
on public.files
for select
to authenticated
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'hod'
    and department = (auth.jwt() -> 'app_metadata' ->> 'department')
  )
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
    and user_id = auth.uid()
  )
);

drop policy if exists files_insert_own on public.files;
create policy files_insert_own
on public.files
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or department = (auth.jwt() -> 'app_metadata' ->> 'department')
  )
);

drop policy if exists files_update_hod_principal on public.files;
create policy files_update_hod_principal
on public.files
for update
to authenticated
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'hod'
    and department = (auth.jwt() -> 'app_metadata' ->> 'department')
  )
  or user_id = auth.uid()
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal')
  or (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'hod'
    and department = (auth.jwt() -> 'app_metadata' ->> 'department')
  )
  or user_id = auth.uid()
);

drop policy if exists files_delete_owner_or_admin on public.files;
create policy files_delete_owner_or_admin
on public.files
for delete
to authenticated
using (
  user_id = auth.uid()
  or (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

drop policy if exists notifications_select_own_or_admin on public.notifications;
create policy notifications_select_own_or_admin
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin
on public.notifications
for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists audit_settings_select_authenticated on public.audit_settings;
create policy audit_settings_select_authenticated
on public.audit_settings
for select
to authenticated
using (true);

drop policy if exists audit_settings_insert_principal on public.audit_settings;
create policy audit_settings_insert_principal
on public.audit_settings
for insert
to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal');

drop policy if exists audit_settings_update_principal on public.audit_settings;
create policy audit_settings_update_principal
on public.audit_settings
for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'principal');

drop policy if exists document_features_select_admin on public.document_features;
create policy document_features_select_admin
on public.document_features
for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal'));

drop policy if exists verification_results_select_admin on public.verification_results;
create policy verification_results_select_admin
on public.verification_results
for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal'));

insert into storage.buckets (id, name, public)
values ('audit_files', 'audit_files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audit_templates', 'audit_templates', false)
on conflict (id) do nothing;

drop policy if exists audit_files_read_role_based on storage.objects;
create policy audit_files_read_role_based
on storage.objects
for select
to authenticated
using (
  bucket_id = 'audit_files'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'hod'
      and split_part(name, '/', 1) = (auth.jwt() -> 'app_metadata' ->> 'department')
    )
    or split_part(name, '/', 2) = auth.uid()::text
  )
);

drop policy if exists audit_files_insert_role_based on storage.objects;
create policy audit_files_insert_role_based
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audit_files'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') in ('staff', 'hod')
      and split_part(name, '/', 1) = (auth.jwt() -> 'app_metadata' ->> 'department')
      and split_part(name, '/', 2) = auth.uid()::text
    )
  )
);

drop policy if exists audit_files_update_role_based on storage.objects;
create policy audit_files_update_role_based
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audit_files'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or split_part(name, '/', 2) = auth.uid()::text
  )
)
with check (
  bucket_id = 'audit_files'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or split_part(name, '/', 2) = auth.uid()::text
  )
);

drop policy if exists audit_files_delete_role_based on storage.objects;
create policy audit_files_delete_role_based
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audit_files'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'principal'
    or split_part(name, '/', 2) = auth.uid()::text
    or (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'hod'
      and split_part(name, '/', 1) = (auth.jwt() -> 'app_metadata' ->> 'department')
    )
  )
);

drop policy if exists audit_templates_read_auth on storage.objects;
create policy audit_templates_read_auth
on storage.objects
for select
to authenticated
using (bucket_id = 'audit_templates');

drop policy if exists audit_templates_insert_principal_hod on storage.objects;
create policy audit_templates_insert_principal_hod
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audit_templates'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

drop policy if exists audit_templates_update_principal_hod on storage.objects;
create policy audit_templates_update_principal_hod
on storage.objects
for update
to authenticated
using (
  bucket_id = 'audit_templates'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
)
with check (
  bucket_id = 'audit_templates'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

drop policy if exists audit_templates_delete_principal_hod on storage.objects;
create policy audit_templates_delete_principal_hod
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audit_templates'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal')
);

