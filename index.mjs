// server/index.mjs
// Minimal local REST API for LIAR.KL, backed by SQLite (server/liarkl.db).
// Zero external dependencies — uses only Node's built-in http + node:sqlite.
//
// Run: node server/index.mjs
// Then: curl http://localhost:4000/api/species
//       curl http://localhost:4000/api/species/Rafflesia
//       curl http://localhost:4000/api/stats
//
// MIGRATION NOTE (for Phase 2 — cloud):
// Every route below only touches the `species` table through plain SQL.
// To migrate to Firestore/Supabase/any cloud DB later, swap out the
// three query functions at the top (getAll / getOne / getStats) for
// calls to the cloud SDK — the HTTP route handlers underneath don't
// need to change at all, since they only consume the returned JSON shape.

import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "liarkl.db");
const PORT = process.env.PORT || 4000;

const db = new DatabaseSync(DB_PATH, { readOnly: true });

function getAll({ letter, isNew, q } = {}) {
  let sql = "SELECT * FROM species WHERE 1=1";
  const params = [];
  if (letter) { sql += " AND letter = ?"; params.push(letter.toUpperCase()); }
  if (isNew !== undefined) { sql += " AND is_new_entry = ?"; params.push(isNew ? 1 : 0); }
  if (q) { sql += " AND name LIKE ?"; params.push(`%${q}%`); }
  sql += " ORDER BY name ASC";
  return db.prepare(sql).all(...params);
}

function getOne(name) {
  return db.prepare("SELECT * FROM species WHERE lower(name) = lower(?)").get(name);
}

function getStats() {
  const total = db.prepare("SELECT COUNT(*) c FROM species").get().c;
  const newEntries = db.prepare("SELECT COUNT(*) c FROM species WHERE is_new_entry = 1").get().c;
  const withPhoto = db.prepare("SELECT COUNT(*) c FROM species WHERE photo_path IS NOT NULL").get().c;
  const withDescription = db.prepare("SELECT COUNT(*) c FROM species WHERE description IS NOT NULL").get().c;
  const byLetter = db.prepare("SELECT letter, COUNT(*) c FROM species GROUP BY letter ORDER BY letter").all();
  return { total, newEntries, original: total - newEntries, withPhoto, withDescription, byLetter };
}

function send(res, status, body) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "species", ...]

  try {
    if (parts[0] !== "api") return send(res, 404, { error: "not found" });

    if (parts[1] === "species" && !parts[2]) {
      const letter = url.searchParams.get("letter");
      const q = url.searchParams.get("q");
      const isNewParam = url.searchParams.get("isNew");
      const isNew = isNewParam === null ? undefined : isNewParam === "true";
      return send(res, 200, getAll({ letter, isNew, q }));
    }

    if (parts[1] === "species" && parts[2]) {
      const name = decodeURIComponent(parts[2]);
      const row = getOne(name);
      if (!row) return send(res, 404, { error: `species '${name}' not found` });
      return send(res, 200, row);
    }

    if (parts[1] === "stats") {
      return send(res, 200, getStats());
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`LIAR.KL local API listening on http://localhost:${PORT}`);
  console.log(`  GET /api/species             - list all (supports ?letter=, ?q=, ?isNew=true)`);
  console.log(`  GET /api/species/:name        - one species`);
  console.log(`  GET /api/stats                - summary stats`);
});
