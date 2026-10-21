# LIAR.KL Database

Local SQLite database and REST API for the LIAR.KL Malaysian wildflower biodiversity catalogue.

The catalogue covers **321 species** across **24 letters**. It contains 283 species digitised from a 1956 botanical reference, plus 38 new entries from field photography.

## Features

- SQLite database with description, habitat, season, conservation status, and photo reference for every species
- REST API for lookup, filtering by letter, and filtering by new entries
- Zero external npm packages. Uses Node.js built-in `node:sqlite` and `node:http`

## Requirements

- Node.js 22 or later (for `node:sqlite`)

## Getting started

Build the database from the source data:

    node server/build-db.mjs

Start the API (default port 4000):

    node server/index.mjs

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Summary counts |
| `GET /api/species` | All species |
| `GET /api/species/:name` | One species, for example `Rafflesia` |
| `GET /api/species?letter=R` | Species starting with a letter |
| `GET /api/species?isNew=true` | The 38 new entries |

Example:

    curl http://localhost:4000/api/species/Rafflesia

## Database schema

Single table `species`: `id`, `name`, `letter`, `photo_path`, `description`, `habitat`, `season`, `conservation`, `is_new_entry`, `created_at`.

## Status

- SQLite is the current storage layer.
- Migration to Firebase is planned as the next phase.
- Photos are not included in this repository. `photo_path` stores the reference only.

## Author

Faiq Arifbillah, Universiti Tenaga Nasional (UNITEN). Built under Grant Project YCUCE2025022 with TNBR.
