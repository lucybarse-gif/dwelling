-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable PostGIS for spatial queries (optional, for map features later)
-- create extension if not exists "postgis";

-- ============================================================
-- BUILDINGS (sourced from NYC PLUTO dataset)
-- ============================================================
create table if not exists buildings (
  id          uuid primary key default uuid_generate_v4(),
  bbl         text unique not null,  -- Borough-Block-Lot identifier from PLUTO
  address     text not null,
  borough     text not null check (borough in ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  zip_code    text not null,
  units_total integer,
  year_built  integer,
  building_class text,               -- PLUTO building class code (e.g. D4, R2)
  land_use    text,                  -- PLUTO land use category
  neighborhood text,
  owner_name  text,
  lot_area    numeric,
  building_area numeric,
  num_floors  numeric,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Full-text search index on address
create index if not exists buildings_address_fts
  on buildings using gin(to_tsvector('english', address));

-- Index for borough + zip queries
create index if not exists buildings_borough_zip
  on buildings (borough, zip_code);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Automatically create a profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists reviews (
  id                uuid primary key default uuid_generate_v4(),
  building_id       uuid not null references buildings(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  overall_rating    integer not null check (overall_rating between 1 and 5),
  noise_rating      integer check (noise_rating between 1 and 5),
  management_rating integer check (management_rating between 1 and 5),
  safety_rating     integer check (safety_rating between 1 and 5),
  value_rating      integer check (value_rating between 1 and 5),
  content           text not null check (char_length(content) >= 50),
  unit_number       text,
  tenancy_start     date,
  tenancy_end       date,
  is_current_tenant boolean not null default false,
  is_anonymous      boolean not null default false,
  helpful_count     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One review per user per building
  unique (building_id, user_id)
);

create index if not exists reviews_building_id on reviews (building_id);
create index if not exists reviews_user_id on reviews (user_id);

-- ============================================================
-- VIEW: buildings with aggregated review stats
-- ============================================================
create or replace view buildings_with_stats as
select
  b.*,
  round(avg(r.overall_rating), 1)    as avg_overall_rating,
  count(r.id)                         as review_count
from buildings b
left join reviews r on r.building_id = b.id
group by b.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table buildings enable row level security;
alter table reviews   enable row level security;
alter table profiles  enable row level security;

-- Buildings: public read, no direct writes (loaded via migration/admin)
create policy "buildings_public_read" on buildings
  for select using (true);

-- Reviews: public read
create policy "reviews_public_read" on reviews
  for select using (true);

-- Reviews: authenticated users can insert their own
create policy "reviews_insert_own" on reviews
  for insert with check (auth.uid() = user_id);

-- Reviews: users can update/delete their own
create policy "reviews_update_own" on reviews
  for update using (auth.uid() = user_id);

create policy "reviews_delete_own" on reviews
  for delete using (auth.uid() = user_id);

-- Profiles: users can read all profiles
create policy "profiles_public_read" on profiles
  for select using (true);

-- Profiles: users can update their own
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ============================================================
-- SAMPLE DATA (for development)
-- ============================================================
insert into buildings (bbl, address, borough, zip_code, units_total, year_built, building_class, neighborhood, latitude, longitude)
values
  ('1000010001', '1 Broadway', 'Manhattan', '10004', 48, 1921, 'D4', 'Financial District', 40.7069, -74.0089),
  ('3001230045', '45 Park Pl', 'Brooklyn', '11201', 120, 2005, 'D4', 'Downtown Brooklyn', 40.6928, -73.9903),
  ('4023450012', '12 Jackson Ave', 'Queens', '11101', 36, 1965, 'C4', 'Long Island City', 40.7453, -73.9402),
  ('2034560023', '23 Grand Concourse', 'Bronx', '10451', 80, 1938, 'D1', 'Mott Haven', 40.8108, -73.9244),
  ('5001230034', '34 Victory Blvd', 'Staten Island', '10301', 24, 1972, 'C6', 'St. George', 40.6418, -74.0776),
  ('1001450067', '67 W 42nd St', 'Manhattan', '10036', 200, 1990, 'D4', 'Midtown', 40.7557, -73.9890),
  ('3012340089', '89 Atlantic Ave', 'Brooklyn', '11201', 55, 2018, 'D4', 'Cobble Hill', 40.6883, -73.9952)
on conflict (bbl) do nothing;
