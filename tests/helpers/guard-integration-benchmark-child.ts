import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  guardIntentOperation,
  resolveIntentOperationTargetLocked,
  withLockedIntentRegistry,
  type IntentOperation,
  type IntentStatus,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const operation = process.argv[2] as IntentOperation;
const status: IntentStatus = process.argv[3] === "archived" ? "archived" : "in-flight";
const sampleCount = Number.parseInt(process.argv[4] ?? "1", 10);
const rows = Array.from(
  { length: 10_000 },
  (_, index) => ({
    uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    slug: `intent-${index}`,
    dirName: `260723-intent-${index}`,
    status: (index === 9_999 ? status : "in-flight") as IntentStatus,
  }),
);
const fixtureSha256 = createHash("sha256")
  .update(JSON.stringify(rows))
  .digest("hex");
const target = rows[9_999];
const root = mkdtempSync(join(tmpdir(), "guard-benchmark-"));
const intents = join(root, "amadeus", "spaces", "default", "intents");
mkdirSync(intents, { recursive: true });
writeFileSync(join(intents, "intents.json"), `${JSON.stringify(rows)}\n`);
try {
  const samples = withLockedIntentRegistry(root, (context) =>
    Array.from({ length: sampleCount }, () => {
      const rssBefore = process.memoryUsage.rss();
      const started = performance.now();
      const validated = resolveIntentOperationTargetLocked(context, target);
      const result = guardIntentOperation(validated, operation);
      return {
        operation,
        status,
        elapsedMs: performance.now() - started,
        rssDeltaBytes: Math.max(0, process.memoryUsage.rss() - rssBefore),
        fixtureSha256,
        correct: status === "archived"
          ? result.kind === "rejected"
          : result.kind === "allowed",
      };
    })
  );
  console.log(JSON.stringify(samples));
} finally {
  rmSync(root, { recursive: true, force: true });
}
