update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'principal',
  'department', 'ALL'
)
where email = 'principalspcet@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'CSE'
)
where email in ('csestaff-1@gmail.com', 'csestaff-2@gmail.com', 'csestaff-3@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'staff',
  'department', 'IT'
)
where email in ('itstaff-1@gmail.com', 'itstaff-2@gmail.com', 'itstaff-3@gmail.com');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'CSE'
)
where email = 'csehod@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'hod',
  'department', 'IT'
)
where email = 'ithod@gmail.com';

