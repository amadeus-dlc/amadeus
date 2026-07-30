// covers: otel:subprocess-span tools:amadeus-migrate tools:amadeus-mirror-lifecycle tools:amadeus-plugin
// size: medium
//
// The subprocess-boundary call sites of the migrator, the Mirror lifecycle and
// the plugin CLI, moved onto the canonical Trace API path (FR-TRC-1, FR-MIG-4).
//
// WHAT THIS PINS. Each module still spawns exactly what it spawned before, but
// the boundary now lands as a completed Span in the span store instead of a row
// in the pre-OTel telemetry buffer. The three modules are driven through their
// real in-process seams — runMigration, runMirrorLifecycleBoundary and the
// deps returned by defaultPluginCliDeps — rather than by reading their source,
// so a migration that changed the import but not the executed path fails here.
//
// The spawns are ALLOWED to fail: none of the fixture projects is a git clone
// with an origin, and none has a compiled graph. A non-zero exit is a perfectly
// good observation — what the migration owes is that the observation is a span.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  resetObservabilityConfigCache,
  telemetryDir,
} from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { runMigration } from "../../dist/claude/.claude/tools/amadeus-migrate.ts";
import { runMirrorLifecycleBoundary } from "../../dist/claude/.claude/tools/amadeus-mirror-lifecycle.ts";
import { defaultPluginCliDeps } from "../../dist/claude/.claude/tools/amadeus-plugin.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import {
  clearIntentContextForTests,
  ensureContextManager,
} from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  resetObservabilityConfigCache();
  clearIntentContextForTests();
  ensureContextManager();
  // The telemetry buffer and the span store both hang off the active Intent's
  // record, so both sinks are only observable once one exists.
  birthIntent(proj, "otel-callsite-migration", "default", "feature");
  writeFileSync(
    join(proj, "amadeus", "config.json"),
    JSON.stringify({ observability: { enabled: true } }),
    "utf-8"
  );
  resetObservabilityConfigCache();
});

afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  resetObservabilityConfigCache();
  clearIntentContextForTests();
});

type SpanRecord = { name: string; attributes: Record<string, unknown> };

function spanNames(): string[] {
  const dir = join(docsRoot(proj) as string, ".amadeus-otel");
  if (!existsSync(dir)) return [];
  const names: string[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.startsWith("spans-") || !file.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, file), "utf-8").split("\n")) {
      if (line !== "") names.push((JSON.parse(line) as SpanRecord).name);
    }
  }
  return names;
}

// The legacy sink the migration empties: any `kind: "subprocess"` row left in
// the telemetry buffer means a call site still runs the pre-OTel wrapper.
function legacySubprocessRows(): unknown[] {
  const dir = telemetryDir(proj);
  if (dir === null || !existsSync(dir)) return [];
  const rows: unknown[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.startsWith("buffer-") || !file.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, file), "utf-8").split("\n")) {
      if (line === "") continue;
      const row = JSON.parse(line) as { kind?: string };
      if (row.kind === "subprocess") rows.push(row);
    }
  }
  return rows;
}

describe("amadeus-migrate: the git wrapper is a span", () => {
  test("a dry-run inspection stores subprocess spans for its git calls", () => {
    runMigration({ projectDir: proj });
    expect(spanNames()).toContain("subprocess:git");
    expect(legacySubprocessRows()).toEqual([]);
  });
});

describe("amadeus-mirror-lifecycle: the origin lookup is a span", () => {
  test("resolving the repository from origin stores a subprocess span", async () => {
    await runMirrorLifecycleBoundary({
      projectDir: proj,
      boundary: { kind: "workflow-completed", instance: "t384" },
    });
    expect(spanNames()).toContain("subprocess:git");
    expect(legacySubprocessRows()).toEqual([]);
  });
});

describe("amadeus-plugin: the recompile and runner-gen spawns are spans", () => {
  test("the recompile chain stores a span for the first compile it runs", () => {
    defaultPluginCliDeps().recompile(proj);
    expect(spanNames()).toContain("subprocess:amadeus-graph:compile");
    expect(legacySubprocessRows()).toEqual([]);
  });

  test("runner generation stores its own span", () => {
    defaultPluginCliDeps().generateRunners(proj);
    expect(spanNames()).toContain("subprocess:amadeus-runner-gen:write");
    expect(legacySubprocessRows()).toEqual([]);
  });
});
