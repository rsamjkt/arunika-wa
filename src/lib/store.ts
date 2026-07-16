import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

export function readJson<T>(file: string, fallback: T): T {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch (err) {
    // A truncated/corrupt file (e.g. a process crash mid-write, before the
    // atomic-rename fix below existed) used to be silently treated as
    // empty, quietly discarding everything in it on the next write. Back
    // the bad file up first so a crash never means permanent data loss.
    console.error(`[store] ${file} is corrupt, backing up and falling back to default:`, err);
    try {
      fs.copyFileSync(p, `${p}.corrupt-${Date.now()}`);
    } catch {
      // best-effort backup only
    }
    return fallback;
  }
}

export function writeJson<T>(file: string, data: T) {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  // Write to a temp file and rename over the target — a crash mid-write
  // leaves either the old file or the new one intact, never a half-written
  // truncated file (rename is atomic on the same filesystem, unlike
  // writing straight to `p`).
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, p);
}
