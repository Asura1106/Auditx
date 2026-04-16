create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  doc_type text not null default 'GENERAL',
  required_markers text[] not null default '{}',
  reference_text text not null default '',
  minimum_marker_match numeric not null default 0.6 check (minimum_marker_match >= 0 and minimum_marker_match <= 1),
  minimum_relevance numeric not null default 0.7 check (minimum_relevance >= 0 and minimum_relevance <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_templates_active on public.document_templates(active);
create index if not exists idx_document_templates_doc_type on public.document_templates(doc_type);

alter table public.document_templates enable row level security;

drop policy if exists document_templates_select_authenticated on public.document_templates;
create policy document_templates_select_authenticated
on public.document_templates
for select
to authenticated
using (true);

drop policy if exists document_templates_write_admin on public.document_templates;
create policy document_templates_write_admin
on public.document_templates
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal'))
with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('hod', 'principal'));

alter table public.verification_results
  add column if not exists duplicate_matches jsonb not null default '[]'::jsonb;

alter table public.verification_results
  add column if not exists template_match_score numeric not null default 0;

alter table public.verification_results
  add column if not exists category_relevance_score numeric not null default 0;

create index if not exists idx_verification_results_similarity on public.verification_results(progression_similarity desc);

insert into public.document_templates (
  category,
  doc_type,
  required_markers,
  reference_text,
  minimum_marker_match,
  minimum_relevance,
  active
)
values
(
  'A1-01',
  'CURRICULUM',
  array[
    'outcome based curriculum',
    'course outcome',
    'program outcome',
    'curriculum mapping',
    'blooms taxonomy',
    'po co mapping',
    'assessment strategy'
  ],
  'Outcome-based curriculum with CO-PO/PSO alignment, curriculum mapping, taxonomy-based design and program-level attainment analysis.',
  0.60,
  0.70,
  true
),
(
  'CCM',
  'MINUTES',
  array[
    'meeting number',
    'circular',
    'agenda',
    'discussion',
    'subject code',
    'members present',
    'signature'
  ],
  'Class committee meeting minutes with meeting number, agenda items, discussion points, member attendance and signatures.',
  0.60,
  0.70,
  true
),
(
  'EP-03',
  'MINUTES',
  array[
    'attendees',
    'discussion',
    'decisions taken',
    'next meeting date'
  ],
  'Minutes and reports including attendance, discussion summary, actionable decisions, and next meeting timeline.',
  0.60,
  0.70,
  true
)
on conflict (category) do update set
  doc_type = excluded.doc_type,
  required_markers = excluded.required_markers,
  reference_text = excluded.reference_text,
  minimum_marker_match = excluded.minimum_marker_match,
  minimum_relevance = excluded.minimum_relevance,
  active = excluded.active,
  updated_at = now();
