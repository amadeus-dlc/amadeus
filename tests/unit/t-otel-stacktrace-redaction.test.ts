// covers: otel:redaction
// size: small
//
// U3 (exception) — stacktrace redaction (FR-EXC): a captured `err.stack` is
// filesystem-revealing by construction (every frame carries an absolute path
// naming the machine's user and layout). redactStacktrace rewrites every
// path-like token into one of three bounded forms — repo-relative, `<home>/…`,
// `<external>/…` — and credential-scrubs every line, so a stacktrace attribute
// can be stored without leaking the developer's filesystem or their secrets.
//
// The path regex consumes untrusted, unbounded text (an arbitrary thrown
// error's stack), so the linearity sweep below is part of the contract, not a
// nice-to-have (regex-linearity-untrusted-input).
//
// Pure functions only — no fs, no spawn.

import { afterEach, describe, expect, test } from "bun:test";
import { redactStacktrace } from "../../dist/claude/.claude/otel/redaction.ts";

const REPO = "/Users/dev/src/amadeus";
const HOME = "/Users/dev";

const originalHome = process.env.HOME;
afterEach(() => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
});

function withHome(home: string, fn: () => void): void {
  process.env.HOME = home;
  fn();
}

describe("path rewriting (FR-EXC)", () => {
  test("repo paths become repo-relative", () => {
    withHome(HOME, () => {
      const stack = `Error: boom\n    at run (${REPO}/packages/framework/core/otel/relay.ts:42:9)`;
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("packages/framework/core/otel/relay.ts:42:9");
      expect(out).not.toContain(REPO);
    });
  });

  test("home paths outside the repo become <home>/… and never carry the absolute prefix", () => {
    withHome(HOME, () => {
      const stack = `Error: boom\n    at load (${HOME}/.bun/install/cache/pkg/index.js:7:1)`;
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("<home>/.bun/install/cache/pkg/index.js:7:1");
      expect(out).not.toContain(HOME);
    });
  });

  test("other absolute paths become <external>/…", () => {
    withHome(HOME, () => {
      const stack = "Error: boom\n    at boot (/usr/local/lib/node/loader.js:3:5)";
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("<external>/usr/local/lib/node/loader.js:3:5");
    });
  });

  test("the repo prefix wins over the home prefix when the repo lives under home", () => {
    withHome(HOME, () => {
      const stack = `    at f (${REPO}/tests/x.ts:1:1)`;
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("tests/x.ts:1:1");
      expect(out).not.toContain("<home>");
    });
  });

  test("each path-like token is rewritten — marker counts match token counts", () => {
    withHome(HOME, () => {
      const stack = [
        "Error: boom",
        `    at a (${HOME}/a.js:1:1)`,
        `    at b (${HOME}/b.js:2:2)`,
        "    at c (/opt/c.js:3:3)",
        `    at d (${REPO}/d.ts:4:4)`,
      ].join("\n");
      const out = redactStacktrace(stack, REPO);
      expect(out.split("<home>").length - 1).toBe(2);
      expect(out.split("<external>").length - 1).toBe(1);
      expect(out).toContain("d.ts:4:4");
      expect(out).not.toContain(HOME);
    });
  });

  test("a bare root token becomes its own marker rather than an empty string", () => {
    withHome(HOME, () => {
      expect(redactStacktrace(`    at f (${REPO}`, REPO)).toBe("    at f (.");
      expect(redactStacktrace(`    at f (${HOME}`, REPO)).toBe("    at f (<home>");
    });
  });

  test("a trailing separator on repoRoot does not change the result", () => {
    withHome(HOME, () => {
      const stack = `    at f (${REPO}/tests/x.ts:1:1)`;
      expect(redactStacktrace(stack, `${REPO}/`)).toBe(redactStacktrace(stack, REPO));
    });
  });

  test("non-path text and blank input pass through unchanged", () => {
    withHome(HOME, () => {
      expect(redactStacktrace("Error: boom\n    at <anonymous>", REPO)).toBe("Error: boom\n    at <anonymous>");
      expect(redactStacktrace("", REPO)).toBe("");
    });
  });
});

describe("credential scrubbing over the whole stack (FR-DST-5)", () => {
  test("credential-shaped substrings in any line are masked", () => {
    withHome(HOME, () => {
      const stack = [
        "Error: request failed: Bearer abcdefghijklmnopqrstuvwxyz012345",
        `    at post (${REPO}/relay.ts:1:1) token=ghp_abcdefghijklmnopqrstuvwxyz012345`,
      ].join("\n");
      const out = redactStacktrace(stack, REPO);
      expect(out).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz012345");
      expect(out).not.toContain("Bearer abcdefghijklmnopqrstuvwxyz012345");
      expect(out).toContain("[REDACTED]");
    });
  });

  test("redaction is idempotent — a second pass is a no-op", () => {
    withHome(HOME, () => {
      const stack = `Error: AKIAIOSFODNN7EXAMPLE\n    at f (${HOME}/x.js:1:1)\n    at g (${REPO}/y.ts:2:2)`;
      const once = redactStacktrace(stack, REPO);
      expect(redactStacktrace(once, REPO)).toBe(once);
    });
  });
});

describe("linearity on adversarial input (regex-linearity-untrusted-input)", () => {
  // The fixture is the shape that actually discriminates: a long run of
  // separator-delimited segments inside a frame that never closes its paren.
  // Against a nested quantifier (`/(?:\/[^\s()]+)+\)/`) every start position
  // fails and the engine re-partitions the run exponentially — measured at
  // ~4x per two added segments, i.e. unfinishable well below 100KB. A single
  // character class under a single quantifier scans it once. The sweep also
  // pins correctness at every size, so a fast regression that stops rewriting
  // paths still fails.
  function adversarial(bytes: number): string {
    return `Error: boom\n    at f (${"/aaa".repeat(Math.floor(bytes / 4))}`;
  }

  test("input-size sweep stays within a generous ceiling and keeps rewriting", () => {
    withHome(HOME, () => {
      for (const bytes of [12_500, 25_000, 50_000, 100_000]) {
        const input = adversarial(bytes);
        const startedAt = performance.now();
        const out = redactStacktrace(input, REPO);
        const elapsedMs = performance.now() - startedAt;
        expect(elapsedMs).toBeLessThanOrEqual(2_000);
        expect(out).toContain("<external>");
      }
    });
  }, 30_000);

  test("a 100KB stack of real-looking frames is rewritten completely", () => {
    withHome(HOME, () => {
      const frame = `    at frame (${HOME}/deps/module/file.js:12:34)\n`;
      const lines = Math.ceil(100_000 / frame.length);
      const startedAt = performance.now();
      const out = redactStacktrace(`Error: boom\n${frame.repeat(lines)}`, REPO);
      const elapsedMs = performance.now() - startedAt;
      expect(elapsedMs).toBeLessThanOrEqual(2_000);
      expect(out).not.toContain(HOME);
      expect(out.split("<home>").length - 1).toBe(lines);
    });
  }, 30_000);
});
