// server/build-db.mjs
// Builds liarkl.db (SQLite) from the data currently embedded in src/App.jsx.
// This is the "real database" layer for LIAR.KL — local-first, migration-ready.
//
// Run: node server/build-db.mjs
// Output: server/liarkl.db

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { RAW_DATA, PHOTO_FILES, PHOTO_MAP, DESCRIPTIONS, normalizeKey } from "./data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "liarkl.db");

// Original 1956-book scope (283 species) — anything outside this set is a
// later addition (Dome Nikong field photos, added post-1956-digitisation).
// Source of truth for "is_new" flag is derived at build time by diffing
// against the original digitised list — kept here as a static snapshot
// generated during the Sept 2026 audit (see project notes).
const ORIGINAL_283 = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, "original-283.json"), "utf8")));
const normForDiff = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE species (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    letter TEXT NOT NULL,
    photo_path TEXT,
    description TEXT,
    habitat TEXT,
    season TEXT,
    conservation TEXT,
    is_new_entry INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_species_letter ON species(letter);
  CREATE INDEX idx_species_name ON species(name);
`);

const insert = db.prepare(`
  INSERT INTO species (name, letter, photo_path, description, habitat, season, conservation, is_new_entry)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
let newCount = 0;
let missingDesc = 0;

for (const [letter, names] of Object.entries(RAW_DATA)) {
  for (const name of names) {
    const key = normalizeKey(name);
    const photoPath = PHOTO_MAP[key] || null;
    const desc = DESCRIPTIONS[name];
    const isNew = ORIGINAL_283.has(normForDiff(name)) ? 0 : 1;

    if (!desc) missingDesc++;
    if (isNew) newCount++;

    insert.run(
      name,
      letter,
      photoPath,
      desc?.description ?? null,
      desc?.habitat ?? null,
      desc?.season ?? null,
      desc?.conservation ?? null,
      isNew
    );
    count++;
  }
}

console.log(`Seeded ${count} species into ${DB_PATH}`);
console.log(`  - new entries (post-1956-book, Dome Nikong): ${newCount}`);
console.log(`  - missing description: ${missingDesc}`);

// sanity query
const row = db.prepare("SELECT COUNT(*) as c FROM species").get();
console.log(`Verified row count: ${row.c}`);

db.close();
