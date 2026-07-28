import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLifecycleAuditEntryUnlocked } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  type IntentLifecycleAuditEvent,
  runIntentLifecycleTransactionLocked,
  withIntentLifecyclePreflight,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const size = Number(process.argv[2]);
const mode = process.argv[3] ?? "archive";
const projectDir = join(tmpdir(), `amadeus-lifecycle-bench-${crypto.randomUUID()}`);
const intentsDir = join(projectDir, "amadeus", "spaces", "default", "intents");
const intentDir = "260723-benchmark-target";
const recordDir = join(intentsDir, intentDir);
const auditDir = join(recordDir, "audit");
const auditPath = join(auditDir, "fixture.jsonl");
const operationId = "123e4567-e89b-42d3-a456-426614174000";
const rows = Array.from({ length: size }, (_, index) => ({
  uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  slug: `intent-${index}`,
  dirName: index === 0 ? intentDir : `260723-intent-${index}`,
  status: "in-flight",
}));
const auditRows = Array.from({ length: size - 1 }, (_, index) => `${JSON.stringify({
  schemaVersion: 1,
  seq: index + 1,
  cloneId: "benchclone001",
  intentId: intentDir,
  timestamp: `2026-07-22T${String(Math.floor(index / 3600) % 24).padStart(2, "0")}:${String(Math.floor(index / 60) % 60).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}Z`,
  heading: "Session Start",
  event: "SESSION_STARTED",
  fields: {},
})}\n`).join("");
const humanTurn = `${JSON.stringify({
  schemaVersion: 1,
  seq: size,
  cloneId: "benchclone001",
  intentId: intentDir,
  timestamp: "2026-07-23T10:00:00Z",
  heading: "Human Turn",
  event: "HUMAN_TURN",
  fields: {},
})}\n`;
const fixtureBytes = `${JSON.stringify(rows)}\n${auditRows}${humanTurn}`;
const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");

mkdirSync(auditDir, { recursive: true });
writeFileSync(join(recordDir, "amadeus-state.md"), "# AI-DLC State Tracking\n");
writeFileSync(join(intentsDir, "intents.json"), `${JSON.stringify(rows)}\n`);
writeFileSync(join(intentsDir, "active-intent"), `${intentDir}\n`);
writeFileSync(auditPath, `${auditRows}${humanTurn}`);

function append(
  event: IntentLifecycleAuditEvent,
  shard: string,
  pd: string,
  intent: string,
  space: string,
): void {
  appendLifecycleAuditEntryUnlocked(event.eventType, {
    Intent: event.intentDir,
    "From Status": event.fromStatus,
    "To Status": event.toStatus,
    "Operation Id": event.operationId,
    "User Input": event.userInput,
    "Human Turn Timestamp": event.humanTurnTimestamp,
  }, pd, intent, space, shard);
}

if (mode === "recovery") {
  writeFileSync(
    join(intentsDir, ".amadeus-intent-status-transaction.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      operationId,
      verb: "archive",
      intentDir,
      fromStatus: "in-flight",
      toStatus: "archived",
      humanTurn: { shard: "fixture.jsonl", timestamp: "2026-07-23T10:00:00Z" },
      userInput: "benchmark",
      auditCommitted: false,
      registryCommitted: false,
      cursorCommitted: false,
    })}\n`,
  );
}

const rssBefore = process.memoryUsage.rss();
const started = performance.now();
if (mode !== "noop") {
  withIntentLifecyclePreflight(projectDir, "default", append, (context, recovery) => {
    if (mode === "archive" && recovery.kind === "none") {
      runIntentLifecycleTransactionLocked(context, intentDir, "archive", "benchmark", append);
    }
  });
}
const elapsedMs = performance.now() - started;
const rssDeltaBytes = Math.max(0, process.memoryUsage.rss() - rssBefore);
rmSync(projectDir, { recursive: true, force: true });
console.log(JSON.stringify({ mode, size, elapsedMs, rssDeltaBytes, fixtureSha256 }));
