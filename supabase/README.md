# Supabase Database Files

This folder contains the Git-tracked database setup for the Academic Audit System.

Files:
- `migrations/20260314_001_initial_schema.sql`
  Creates the main tables, indexes, RLS policies, storage buckets, and storage policies.
- `sql/assign_user_metadata.sql`
  Updates `auth.users.raw_app_meta_data` so role and department are available inside JWT claims.

Recommended order in Supabase SQL Editor:
1. Run `migrations/20260314_001_initial_schema.sql`
2. Run `sql/assign_user_metadata.sql`

Notes:
- Do not commit service role keys or database passwords.
- The app uses Supabase Edge Functions with the service role key for privileged operations.
- Public/client access should still be controlled through JWT app metadata and storage policies.

