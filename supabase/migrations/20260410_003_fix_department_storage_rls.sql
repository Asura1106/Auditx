-- Fix department-aware RLS for storage and files across all departments.
-- Some users may have role/department in user_metadata instead of app_metadata.

create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    nullif(auth.jwt() ->> 'role', '')
  );
$$;

create or replace function public.jwt_department()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'department', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'department', ''),
    nullif(auth.jwt() ->> 'department', '')
  );
$$;

alter table public.files
drop constraint if exists files_department_check;

alter table public.files
add constraint files_department_check
check (department in ('CSE', 'IT', 'BIO', 'CHEM', 'AIDS', 'MECH', 'ALL'));

drop policy if exists audit_files_read_role_based on storage.objects;
create policy audit_files_read_role_based
on storage.objects
for select
to authenticated
using (
  bucket_id = 'audit_files'
  and (
    public.jwt_role() = 'principal'
    or (
      public.jwt_role() = 'hod'
      and upper(split_part(name, '/', 1)) = upper(public.jwt_department())
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
    public.jwt_role() = 'principal'
    or (
      public.jwt_role() in ('staff', 'hod')
      and upper(split_part(name, '/', 1)) = upper(public.jwt_department())
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
    public.jwt_role() = 'principal'
    or split_part(name, '/', 2) = auth.uid()::text
  )
)
with check (
  bucket_id = 'audit_files'
  and (
    public.jwt_role() = 'principal'
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
    public.jwt_role() = 'principal'
    or split_part(name, '/', 2) = auth.uid()::text
    or (
      public.jwt_role() = 'hod'
      and upper(split_part(name, '/', 1)) = upper(public.jwt_department())
    )
  )
);
