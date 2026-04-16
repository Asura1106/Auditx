update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'principal',
  'department', 'ALL'
)
where email = 'principalspcet@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'BIO'
)
where email in ('biostaff-1@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'MECH'
)
where email in ('mechstaff-1@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'CHEM'
)
where email in ('chemstaff-1@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'AIDS'
)
where email in ('aidsstaff-1@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'IT'
)
where email in ('itstaff-1@gmail.com', 'itstaff-2@gmail.com', 'itstaff-3@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'CSE'
)
where email in ('csestaff-1@gmail.com', 'csestaff-2@gmail.com', 'csestaff-3@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'CSE'
)
where email in ('csehod@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'CHEM'
)
where email in ('chemhod@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'AIDS'
)
where email in ('aidshod@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'MECH'
)
where email in ('mechhod@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'BIO'
)
where email in ('biohod@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'IT'
)
where email = 'ithod@gmail.com';
