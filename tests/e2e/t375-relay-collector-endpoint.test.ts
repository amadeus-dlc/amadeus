// covers: otel:relay
// size: large
//
// U11 (otlp-relay) — the real wire. Everything else drives the Collector
// through the post port; this suite drives the default `fetch` sender against
// a loopback listener, because three properties only exist on the wire:
//
//   - the request carries NO authorization header (NFR-4, BR-4): the Relay
//     talks to a local Collector and holds no credential;
//   - a Collector answering 5xx is a refusal, not an exception (BR-10);
//   - a Collector that is simply not listening is the same (FR-RLY-3), and the
//     flush still returns a result instead of throwing.
//
// LARGE tier: the loopback HTTP hop is a network signal (t358 precedent).
// Imports come from the shipped dist tree.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { flushSignals } from "../../dist/claude/.claude/otel/relay.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  birthIntent(proj, "otel-u11-relay-wire", "default", "feature");
});

afterEach(() => {
  cleanupTestProject(proj);
});

function seedSpan(): void {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "spans-clone01.jsonl"),
    `${JSON.stringify({
      traceId: "0123456789abcdef0123456789abcdef",
      spanId: "aaaaaaaaaaaaaaaa",
      parentSpanId: null,
      name: "stage code-generation",
      kind: "INTERNAL",
      startMs: Date.now(),
      endMs: Date.now(),
      status: { code: "OK" },
      attributes: { Stage: "code-generation" },
      events: [],
      links: [],
      resource: { "service.name": "amadeus" },
      instrumentationScope: { name: "amadeus" },
    })}\n`,
    "utf-8"
  );
}

describe("posting to a Collector on loopback", () => {
  test("delivers the batch and sends no authorization header", async () => {
    seedSpan();
    const seen: { path: string; headers: Record<string, string>; body: string }[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: async (request) => {
        seen.push({
          path: new URL(request.url).pathname,
          headers: Object.fromEntries(request.headers.entries()),
          body: await request.text(),
        });
        return new Response("{}", { status: 200 });
      },
    });
    try {
      const result = await flushSignals({ projectDir: proj, endpoint: `http://127.0.0.1:${server.port}` });
      expect(result.sent).toBe(1);
      expect(result.cursorAdvanced).toBe(true);
      expect(seen[0]?.path).toBe("/v1/traces");
      expect(seen[0]?.headers["content-type"]).toBe("application/json");
      expect(seen[0]?.headers.authorization).toBeUndefined();
      expect(seen[0]?.body).toContain("0123456789abcdef0123456789abcdef");
    } finally {
      server.stop(true);
    }
  });

  test("a Collector answering 500 refuses the batch without throwing", async () => {
    seedSpan();
    const server = Bun.serve({ port: 0, fetch: () => new Response("collector-body-detail", { status: 500 }) });
    try {
      const result = await flushSignals({ projectDir: proj, endpoint: `http://127.0.0.1:${server.port}` });
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.cursorAdvanced).toBe(false);
      // The status code travels; the response body does not
      // (security-design.md § diagnostics の節度設計).
      expect(result.diagnostics.join(" ")).toContain("500");
      expect(result.diagnostics.join(" ")).not.toContain("collector-body-detail");
    } finally {
      server.stop(true);
    }
  });

  test("a Collector that is not listening leaves the flush successful and the record pending", async () => {
    seedSpan();
    // Port 1 on loopback: nothing listens, so the connection is refused
    // outright rather than hanging.
    const result = await flushSignals({ projectDir: proj, endpoint: "http://127.0.0.1:1" });
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.cursorAdvanced).toBe(false);
  });
});
