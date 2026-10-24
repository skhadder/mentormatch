// Local JSON-file storage (server only). Changes persist across restarts and
// are read by the matcher on the very next request.
import fs from "node:fs";
import path from "node:path";
import seed from "@/data/mentors.json";
import type { Db } from "./requests";
import type { Mentor } from "./types";

const file = () => process.env.MENTORMATCH_DB ?? path.join(process.cwd(), ".data", "db.json");

function freshDb(): Db {
  return { mentors: structuredClone(seed) as Mentor[], requests: [] };
}

export function loadDb(): Db {
  try {
    return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file(), "utf8")) as Db;
  } catch {
    const db = freshDb();
    saveDb(db);
    return db;
  }
}

export function saveDb(db: Db) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const tmp = `${file()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file()); // atomic replace
}

// Run a change and save it. Synchronous, so requests cannot interleave.
export function mutate<T>(fn: (db: Db) => T): T {
  const db = loadDb();
  const out = fn(db);
  saveDb(db);
  return out;
}

// Replace (never duplicate) the mentors from the seed file, and clear requests.
export function resetDb() {
  saveDb(freshDb());
}
