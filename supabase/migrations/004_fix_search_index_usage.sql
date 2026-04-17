-- The buildings_with_stats view has a GROUP BY, so PostgreSQL materialises the
-- entire 767k-row view before applying any WHERE clause, making every search a
-- full table scan that times out.
--
-- Fix: filter on the `buildings` table directly (where the trigram index lives)
-- then LEFT JOIN reviews inline.  The planner can now use the GIN index.

drop function if exists search_buildings(text,text,text,integer,integer);
drop function if exists count_buildings_search(text,text,text);

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
  select
    b.*,
    round(avg(r.overall_rating), 1) as avg_overall_rating,
    count(r.id)                      as review_count
  from buildings b
  left join reviews r on r.building_id = b.id
  where
    (
      b.address ilike '%' || normalize_address_query(query_text) || '%'
      or normalize_address_query(query_text) <<% b.address
    )
    and (p_borough      is null or b.borough      = p_borough)
    and (p_neighborhood is null or b.neighborhood = p_neighborhood)
  group by b.id
  order by
    word_similarity(normalize_address_query(query_text), b.address) desc,
    count(r.id) desc
  limit  p_limit
  offset p_offset;
$$;

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
  from buildings b
  where
    (
      b.address ilike '%' || normalize_address_query(query_text) || '%'
      or normalize_address_query(query_text) <<% b.address
    )
    and (p_borough      is null or b.borough      = p_borough)
    and (p_neighborhood is null or b.neighborhood = p_neighborhood);
$$;
