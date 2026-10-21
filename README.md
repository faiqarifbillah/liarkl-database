# LIAR.KL — Local Database Layer

Real SQLite database (`liarkl.db`) + a small REST API, built from the exact
data currently embedded in `src/App.jsx` (`RAW_DATA`, `PHOTO_FILES`,
`PHOTO_MAP`, `DESCRIPTIONS`). Zero external npm packages — uses Node's
built-in `node:sqlite` and `node:http` only, so there's nothing to install.

**The live site (`src/App.jsx`) is untouched.** This is a separate, additive
layer — safe to run alongside the existing Vite dev server.

## Run it

```bash
# 1. Build (or rebuild) the database from App.jsx's current data
node server/build-db.mjs

# 2. Start the API
node server/index.mjs
```

Then:

```bash
curl http://localhost:4000/api/stats
curl http://localhost:4000/api/species
curl http://localhost:4000/api/species/Rafflesia
curl "http://localhost:4000/api/species?isNew=true"   # the 38 post-1956-book additions
curl "http://localhost:4000/api/species?letter=R"
```

## Schema

Single table `species` (id, name, letter, photo_path, description, habitat,
season, conservation, is_new_entry, created_at). `is_new_entry` flags the 38
species added from Dome Nikong's field photos that weren't in the original
1956-book digitisation (283 species).

`original-283.json` is the frozen list used to compute that flag — it's the
normalised name list from the original digitised Excel, not derived from
live data, so it won't drift if `App.jsx` changes later.

## Migrating to the cloud (Phase 2)

Every route in `server/index.mjs` only talks to SQLite through three plain
functions at the top of the file (`getAll`, `getOne`, `getStats`). To move
to Firestore/Supabase/Postgres/etc. later:

1. Swap those three functions for calls to the cloud SDK — the HTTP layer
   underneath doesn't change, since it only consumes the JSON shape they
   return.
2. Write a one-off script that reads `liarkl.db` and pushes each row to the
   cloud DB (same shape as `build-db.mjs`, just writing to a different
   destination instead of SQLite).
3. Point the frontend (`App.jsx`) at the API instead of the static
   `RAW_DATA`/`DESCRIPTIONS` objects — this is the one part that does
   require code changes in the live site, deliberately left undone tonight
   to avoid risking the working site right before a deadline.

Photos stay as static files served from `public/flowers/` either way —
`photo_path` in the DB is just a reference, not a blob, so there's no need
to touch Firebase Storage / any object storage until you actually want the
photos served from the cloud too.
