/**
 * NYC PLUTO → Supabase import script
 *
 * Fetches all residential/mixed-use buildings from the NYC Open Data
 * MapPLUTO dataset and upserts them into the Supabase `buildings` table.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-pluto.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

// NYC Open Data — MapPLUTO (updated regularly by NYC Dept of City Planning)
const PLUTO_ENDPOINT = "https://data.cityofnewyork.us/resource/64uk-42ks.json";

// PLUTO API returns single-digit land use codes ("1", "2", etc.)
// Only import residential/mixed-use buildings
const RESIDENTIAL_LAND_USE = new Set(["1", "2", "3", "4"]);

const BOROUGH_MAP = {
  MN: "Manhattan",
  BK: "Brooklyn",
  QN: "Queens",
  BX: "Bronx",
  SI: "Staten Island",
};

const LAND_USE_LABELS = {
  "1": "One & Two Family",
  "2": "Multi-Family Walkup",
  "3": "Multi-Family Elevator",
  "4": "Mixed Residential & Commercial",
  "5": "Commercial & Office",
  "6": "Industrial & Manufacturing",
  "7": "Transportation & Utility",
  "8": "Public Facilities & Institutions",
  "9": "Open Space & Recreation",
  "10": "Parking Facilities",
  "11": "Vacant Land",
};

const API_PAGE_SIZE = 1000;   // rows per API request
const INSERT_BATCH  = 500;    // rows per Supabase upsert

let totalFetched  = 0;
let totalInserted = 0;
let totalSkipped  = 0;
let page          = 0;

async function fetchPage(offset) {
  const params = new URLSearchParams({
    $limit:  String(API_PAGE_SIZE),
    $offset: String(offset),
    // Only pull rows that have an address and a BBL
    $where:  "bbl IS NOT NULL AND address IS NOT NULL",
    $order:  "bbl ASC",
  });
  const url = `${PLUTO_ENDPOINT}?${params}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`PLUTO API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function transform(row) {
  const borough = BOROUGH_MAP[row.borough];
  if (!borough) return null;                       // skip unknown boroughs
  if (!RESIDENTIAL_LAND_USE.has(row.landuse)) return null; // skip non-residential

  // BBL comes as a float string e.g. "4061730023.00000000" — normalise to integer string
  const bbl = String(Math.round(parseFloat(row.bbl)));

  return {
    bbl,
    address:        row.address?.trim() ?? "",
    borough,
    zip_code:       row.zipcode ?? "",
    units_total:    row.unitstotal  ? parseInt(row.unitstotal,  10) : null,
    year_built:     row.yearbuilt   ? parseInt(row.yearbuilt,   10) : null,
    building_class: row.bldgclass   ?? null,
    land_use:       LAND_USE_LABELS[row.landuse] ?? row.landuse ?? null,
    // ntaname not present in this API version — derive from zonedist or leave null
    neighborhood:   row.ntaname ?? row.zonedist1 ?? null,
    owner_name:     row.ownername   ?? null,
    lot_area:       row.lotarea     ? parseFloat(row.lotarea)   : null,
    building_area:  row.bldgarea    ? parseFloat(row.bldgarea)  : null,
    num_floors:     row.numfloors   ? parseFloat(row.numfloors) : null,
    latitude:       row.latitude    ? parseFloat(row.latitude)  : null,
    longitude:      row.longitude   ? parseFloat(row.longitude) : null,
  };
}

async function upsertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/buildings`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":         SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer":        "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert error ${res.status}: ${text}`);
  }
}

function progress(msg) {
  process.stdout.write(`\r${msg}`.padEnd(80));
}

async function main() {
  console.log("🏙  Dwelling — NYC PLUTO import");
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Fetching residential buildings from NYC Open Data…\n`);

  const startTime = Date.now();

  while (true) {
    const offset = page * API_PAGE_SIZE;
    progress(`Fetching page ${page + 1} (offset ${offset})…`);

    let rows;
    try {
      rows = await fetchPage(offset);
    } catch (err) {
      console.error(`\nFetch error on page ${page + 1}:`, err.message);
      console.error("Retrying in 5 seconds…");
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    if (rows.length === 0) break; // done

    totalFetched += rows.length;

    // Transform + filter
    const transformed = rows.map(transform).filter(Boolean);
    totalSkipped += rows.length - transformed.length;

    // Insert in sub-batches
    for (let i = 0; i < transformed.length; i += INSERT_BATCH) {
      const batch = transformed.slice(i, i + INSERT_BATCH);
      try {
        await upsertBatch(batch);
        totalInserted += batch.length;
      } catch (err) {
        console.error(`\nInsert error:`, err.message);
        // Continue — partial failures shouldn't abort the whole import
      }
      progress(
        `Page ${page + 1} | Fetched: ${totalFetched.toLocaleString()} | ` +
        `Inserted: ${totalInserted.toLocaleString()} | ` +
        `Skipped (non-residential): ${totalSkipped.toLocaleString()}`
      );
    }

    page++;

    // Polite rate limiting — avoid hammering NYC Open Data
    await new Promise(r => setTimeout(r, 200));
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  console.log("\n\n✅ Import complete!");
  console.log(`   Total fetched : ${totalFetched.toLocaleString()}`);
  console.log(`   Total inserted: ${totalInserted.toLocaleString()}`);
  console.log(`   Non-residential skipped: ${totalSkipped.toLocaleString()}`);
  console.log(`   Time: ${mins}m ${secs}s`);
}

main().catch(err => {
  console.error("\n\nFatal error:", err);
  process.exit(1);
});
