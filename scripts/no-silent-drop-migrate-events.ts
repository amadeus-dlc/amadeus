// One-shot migrator: baseline.json + exemptions.json → events/<ulid>.json grants.
// Deterministic ULIDs (ulidFromSeed) so the migration is replay-stable.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeEvent, EVENTS_DIR, type GrantEvent } from "../tests/no-silent-drop/events.ts";
import { parseBaseline, parseExemptions } from "../tests/no-silent-drop/ledger.ts";
import { ulidFromSeed } from "../tests/no-silent-drop/ulid.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function main(): number {
  const baseline = parseBaseline(
    readFileSync(join(ROOT, "tests/no-silent-drop/baseline.json"), "utf8"),
  );
  const exemptions = parseExemptions(
    readFileSync(join(ROOT, "tests/no-silent-drop/exemptions.json"), "utf8"),
  );
  const eventsDir = join(ROOT, EVENTS_DIR);
  mkdirSync(eventsDir, { recursive: true });

  let written = 0;
  for (const entry of baseline.entries) {
    const ulid = ulidFromSeed(`grant:grandfather:${entry.fingerprint}`);
    const event: GrantEvent = {
      schemaVersion: 1,
      ulid,
      op: "grant",
      kind: "grandfather",
      fingerprint: entry.fingerprint,
      ruleId: entry.ruleId,
      file: entry.file,
      reason: entry.reason,
      issues: entry.issues,
    };
    writeFileSync(join(eventsDir, `${ulid}.json`), encodeEvent(event));
    written += 1;
  }
  for (const entry of exemptions.entries) {
    const ulid = ulidFromSeed(`grant:exemption:${entry.fingerprint}`);
    const event: GrantEvent = {
      schemaVersion: 1,
      ulid,
      op: "grant",
      kind: "exemption",
      fingerprint: entry.fingerprint,
      ruleId: "NSD002",
      file: "unknown",
      reason: entry.reason,
      issues: ["#1979"],
    };
    writeFileSync(join(eventsDir, `${ulid}.json`), encodeEvent(event));
    written += 1;
  }
  console.log(`wrote ${written} event files under ${EVENTS_DIR}`);
  return 0;
}

if (import.meta.main) process.exit(main());
