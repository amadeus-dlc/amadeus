import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  migrateClosedSwarmDriverIntent,
  readIntentRegistry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const TARGET = "260713-swarm-driver-migration";
const size = Number(process.argv[2]);
const mode = process.argv[3] === "noop" ? "noop" : "active";
const projectDir = join(tmpdir(), `amadeus-status-bench-${crypto.randomUUID()}`);
const registryPath = join(
  projectDir,
  "amadeus",
  "spaces",
  "default",
  "intents",
  "intents.json",
);

const migrationRows = Array.from({ length: size }, (_, index) => ({
  uuid: String(index),
  slug: `intent-${index}`,
  dirName: index === Math.floor(size / 2) ? TARGET : `intent-${index}`,
  status: index === Math.floor(size / 2) ? "closed" : "in-flight",
}));
const migrationBytes = `${JSON.stringify(migrationRows)}\n`;
const strictBytes = migrationBytes.replace('"closed"', '"archived"');
const fixtureSha256 = createHash("sha256").update(migrationBytes).digest("hex");

mkdirSync(join(registryPath, ".."), { recursive: true });
writeFileSync(registryPath, strictBytes);
const rssBefore = process.memoryUsage.rss();

let strictReadMs = 0;
let migrationMs = 0;
let correct = true;
if (mode === "active") {
  let started = performance.now();
  const strict = readIntentRegistry(projectDir);
  strictReadMs = performance.now() - started;

  started = performance.now();
  const migrated = migrateClosedSwarmDriverIntent(migrationRows);
  migrationMs = performance.now() - started;
  correct =
    strict.length === size &&
    migrated.length === size &&
    strict[Math.floor(size / 2)]?.status === "archived" &&
    migrated[Math.floor(size / 2)]?.status === "archived";
}

const rssAfter = process.memoryUsage.rss();
rmSync(projectDir, { recursive: true, force: true });
console.log(JSON.stringify({
  mode,
  size,
  strictReadMs,
  migrationMs,
  rssDeltaBytes: Math.max(0, rssAfter - rssBefore),
  fixtureSha256,
  correct,
}));
