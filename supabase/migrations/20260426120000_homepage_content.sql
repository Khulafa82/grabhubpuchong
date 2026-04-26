-- Homepage content table
create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.staff_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.homepage_content enable row level security;

create or replace function public.can_edit_homepage(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = _user_id
      and status = 'active'
      and role in ('boss', 'it_tech', 'it_technician', 'super_admin')
  );
$$;

drop policy if exists "Anyone can read homepage_content" on public.homepage_content;
create policy "Anyone can read homepage_content"
on public.homepage_content for select
using (true);

drop policy if exists "Editors can insert homepage_content" on public.homepage_content;
create policy "Editors can insert homepage_content"
on public.homepage_content for insert
to authenticated
with check (public.can_edit_homepage(auth.uid()));

drop policy if exists "Editors can update homepage_content" on public.homepage_content;
create policy "Editors can update homepage_content"
on public.homepage_content for update
to authenticated
using (public.can_edit_homepage(auth.uid()))
with check (public.can_edit_homepage(auth.uid()));

create or replace function public.touch_homepage_content_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_homepage_content on public.homepage_content;
create trigger trg_touch_homepage_content
before update on public.homepage_content
for each row execute function public.touch_homepage_content_updated_at();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('homepage-images', 'homepage-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read homepage images" on storage.objects;
create policy "Public read homepage images"
on storage.objects for select
using (bucket_id = 'homepage-images');

drop policy if exists "Editors can upload homepage images" on storage.objects;
create policy "Editors can upload homepage images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'homepage-images'
  and public.can_edit_homepage(auth.uid())
);

drop policy if exists "Editors can update homepage images" on storage.objects;
create policy "Editors can update homepage images"
on storage.objects for update
to authenticated
using (bucket_id = 'homepage-images' and public.can_edit_homepage(auth.uid()))
with check (bucket_id = 'homepage-images' and public.can_edit_homepage(auth.uid()));

drop policy if exists "Editors can delete homepage images" on storage.objects;
create policy "Editors can delete homepage images"
on storage.objects for delete
to authenticated
using (bucket_id = 'homepage-images' and public.can_edit_homepage(auth.uid()));
