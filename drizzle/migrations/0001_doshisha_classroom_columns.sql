alter table public.buildings add column if not exists sort_order integer;
alter table public.classrooms add column if not exists floor_label text;
alter table public.classrooms add column if not exists floor_order integer;
alter table public.classrooms add column if not exists sort_order integer;