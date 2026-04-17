-- Enable trigram extension for fuzzy address matching
create extension if not exists pg_trgm;

-- Trigram GIN index on address — makes word_similarity() fast
create index if not exists buildings_address_trgm
  on buildings using gin(address gin_trgm_ops);

-- Drop old versions (return type or signature may differ)
drop function if exists normalize_address_query(text);
drop function if exists search_buildings(text,text,text,integer,integer);
drop function if exists count_buildings_search(text,text,text);
drop function if exists get_neighborhoods(text);

-- normalize_address_query: converts full street-type words to PLUTO abbreviations
-- so "42nd Street" and "42nd St" both match stored addresses like "67 W 42nd St"
create or replace function normalize_address_query(q text)
returns text
language sql
immutable
as $$
  select
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
      q,
    '\ystreet\y',     'St',   'gi'),
    '\yavenue\y',     'Ave',  'gi'),
    '\yboulevard\y',  'Blvd', 'gi'),
    '\ydrive\y',      'Dr',   'gi'),
    '\yroad\y',       'Rd',   'gi'),
    '\yplace\y',      'Pl',   'gi'),
    '\ycourt\y',      'Ct',   'gi'),
    '\ylane\y',       'Ln',   'gi'),
    '\yparkway\y',    'Pkwy', 'gi'),
    '\yexpressway\y', 'Expy', 'gi')
$$;

-- search_buildings: fuzzy address search with optional borough/neighborhood filters.
-- Normalizes the query to PLUTO abbreviated format, then matches via ILIKE (exact
-- substring) and word_similarity (fuzzy). Results ordered by closest match first.
create or replace function search_buildings(
  query_text     text,
  p_borough      text    default null,
  p_neighborhood text    default null,
  p_limit        integer default 20,
  p_offset       integer default 0
)
returns setof buildings_with_stats
language sql
security definer
stable
as $$
  select *
  from buildings_with_stats
  where
    (
      address ilike '%' || normalize_address_query(query_text) || '%'
      or word_similarity(normalize_address_query(query_text), address) > 0.2
    )
    and (p_borough is null or borough = p_borough)
    and (p_neighborhood is null or neighborhood = p_neighborhood)
  order by
    word_similarity(normalize_address_query(query_text), address) desc,
    review_count desc
  limit p_limit
  offset p_offset;
$$;

-- count_buildings_search: total match count (same logic as above, for pagination)
create or replace function count_buildings_search(
  query_text     text,
  p_borough      text default null,
  p_neighborhood text default null
)
returns bigint
language sql
security definer
stable
as $$
  select count(*)
  from buildings_with_stats
  where
    (
      address ilike '%' || normalize_address_query(query_text) || '%'
      or word_similarity(normalize_address_query(query_text), address) > 0.2
    )
    and (p_borough is null or borough = p_borough)
    and (p_neighborhood is null or neighborhood = p_neighborhood);
$$;

-- get_neighborhoods: distinct neighborhood names for a borough
create or replace function get_neighborhoods(p_borough text)
returns table(neighborhood text)
language sql
security definer
stable
as $$
  select distinct b.neighborhood
  from buildings b
  where b.borough = p_borough
    and b.neighborhood is not null
  order by b.neighborhood;
$$;
