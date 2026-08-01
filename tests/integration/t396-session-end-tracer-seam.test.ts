// covers: hook:amadeus-session-end otel:bootstrap
// size: medium
//
// The SessionEnd hook's relay block opens a span, and a span needs a Tracer
// Provider. Registration is a once-per-process invariant (NFR-3: the second
// registerTracerProvider throws), which is why bootstrap.ts owns the seam that
// asks before registering. The hook bypassed that seam and called the register
// pair directly (#1857), so a process that already had a Tracer standing lost
// the whole relay block — the intent-anchor persist (FR-TRC-4), the
// session-end->relay span, and the flush — to a throw the block's fail-open
// catch swallows without a trace.
//
// The hook only runs at module top level, so the subject is driven the way the
// harness drives it: a spawned process that registers a Tracer first and then
// imports the shipped hook.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { AMADEUS_SRC, cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const BUN = process.execPath;
const HOOK = join(AMADEUS_SRC, "hooks", "amadeus-session-end.ts");
const TRACER_PROVIDER = join(AMADEUS_SRC, "otel", "tracer-provider.ts");
const SPAN_EXPORTER = join(AMADEUS_SRC, "otel", "local-span-exporter.ts");

let proj: string;

// Telemetry is opt-in, and the relay block (the tracer's only consumer in this
// hook) is behind that opt-in — so the fixture has to turn it on.
function enableObservability(): void {
  writeFileSync(join(proj, "amadeus", "config.json"), JSON.stringify({ observability: { enabled: true } }), "utf-8");
}

// A driver that stands a Tracer up BEFORE the hook runs, then imports the hook
// exactly as the harness does.
function driverPath(preRegisterTracer: boolean): string {
  const path = join(proj, `drive-session-end-${preRegisterTracer ? "registered" : "bare"}.ts`);
  const preamble = preRegisterTracer
    ? [
        `import { registerTracerProvider } from ${JSON.stringify(TRACER_PROVIDER)};`,
        `import { createLocalSpanExporter } from ${JSON.stringify(SPAN_EXPORTER)};`,
        `const projectDir = process.env.CLAUDE_PROJECT_DIR as string;`,
        `registerTracerProvider({ projectDir, spanExporter: createLocalSpanExporter({ projectDir }) });`,
      ]
    : [];
  writeFileSync(path, [...preamble, `await import(${JSON.stringify(HOOK)});`, ""].join("\n"), "utf-8");
  return path;
}

function runDriver(preRegisterTracer: boolean): { exitCode: number; stderr: string } {
  const result = Bun.spawnSync({
    cmd: [BUN, "run", driverPath(preRegisterTracer)],
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    stdin: new TextEncoder().encode(JSON.stringify({ hook_event_name: "SessionEnd", cwd: proj, reason: "logout" })),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { exitCode: result.exitCode, stderr: new TextDecoder().decode(result.stderr) };
}

// Every span this project recorded, across the telemetry store's shards.
function recordedSpanNames(): string[] {
  const dir = join(proj, "amadeus", "spaces", "default", "intents");
  const names: string[] = [];
  for (const intent of readdirSync(dir)) {
    const store = join(dir, intent, ".amadeus-otel");
    if (!existsSync(store)) continue;
    for (const file of readdirSync(store)) {
      if (!file.startsWith("spans-")) continue;
      for (const line of readFileSync(join(store, file), "utf-8").split("\n")) {
        if (line.trim() === "") continue;
        names.push((JSON.parse(line) as { name: string }).name);
      }
    }
  }
  return names;
}

beforeEach(() => {
  proj = createTestProject();
  birthIntent(proj, "session-end-tracer", "default", "feature");
  enableObservability();
});
afterEach(() => {
  cleanupTestProject(proj);
});

describe("SessionEnd tracer wiring (#1857)", () => {
  // Negative control: without a pre-registered Tracer the block always worked,
  // so a failure here means the fixture never reached the relay block at all —
  // not that the seam regressed.
  test("the relay span is recorded when nothing registered a Tracer first", () => {
    const run = runDriver(false);
    expect(run.exitCode).toBe(0);
    expect(recordedSpanNames()).toContain("session-end->relay");
  });

  test("a process with a Tracer already registered still runs the relay block", () => {
    const run = runDriver(true);
    expect(run.exitCode).toBe(0);
    expect(recordedSpanNames()).toContain("session-end->relay");
  });
});
