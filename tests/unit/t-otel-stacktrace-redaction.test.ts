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

import { scaleTestTime } from "../lib/test-time-factor.ts";
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

describe("Windows drive-letter frames (r3695286229)", () => {
  // A Windows stack frame names the machine's user in exactly the way a POSIX
  // one does, but it opens with a drive letter and separates with backslashes,
  // so a pattern anchored on a leading "/" never sees it and the whole frame is
  // stored verbatim.
  const WIN_REPO = "C:\\Users\\dev\\src\\amadeus";
  const WIN_HOME = "C:\\Users\\dev";

  test("repo paths become repo-relative", () => {
    withHome(WIN_HOME, () => {
      const stack = `Error: boom\n    at run (${WIN_REPO}\\packages\\otel\\relay.ts:42:9)`;
      const out = redactStacktrace(stack, WIN_REPO);
      expect(out).toContain("packages/otel/relay.ts:42:9");
      expect(out).not.toContain("Users");
    });
  });

  test("home paths outside the repo become <home>/… and never carry the user name", () => {
    withHome(WIN_HOME, () => {
      const stack = `Error: boom\n    at load (${WIN_HOME}\\.bun\\cache\\pkg\\index.js:7:1)`;
      const out = redactStacktrace(stack, WIN_REPO);
      expect(out).toContain("<home>/.bun/cache/pkg/index.js:7:1");
      expect(out).not.toContain("dev");
    });
  });

  test("other drive-letter paths become <external>/…", () => {
    withHome(WIN_HOME, () => {
      const out = redactStacktrace("Error: boom\n    at boot (D:\\tools\\node\\loader.js:3:5)", WIN_REPO);
      expect(out).toContain("<external>D:/tools/node/loader.js:3:5");
    });
  });

  test("a UNC-style backslash path is still rewritten", () => {
    withHome(WIN_HOME, () => {
      const out = redactStacktrace("    at f (\\\\server\\share\\x.js:1:1)", WIN_REPO);
      expect(out).toContain("<external>");
      expect(out).not.toContain("\\\\server");
    });
  });
});

describe("file:// URL frames (r3695298662)", () => {
  // Bun's ESM loader reports frames as file:// URLs. The scheme's own "//"
  // sits in front of the absolute path, so a token starting at the first "/"
  // captures "//Users/dev/…" — the user name survives unless the scheme is
  // separated before the repo/home comparison runs.
  test("a file:// repo frame becomes repo-relative behind the scheme", () => {
    withHome(HOME, () => {
      const stack = `Error: boom\n    at run (file://${REPO}/packages/otel/relay.ts:42:9)`;
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("file://packages/otel/relay.ts:42:9");
      expect(out).not.toContain(REPO);
    });
  });

  test("a file:// home frame becomes file://<home>/… and drops the absolute prefix", () => {
    withHome(HOME, () => {
      const stack = `    at load (file://${HOME}/.bun/install/cache/pkg/index.js:7:1)`;
      const out = redactStacktrace(stack, REPO);
      expect(out).toContain("file://<home>/.bun/install/cache/pkg/index.js:7:1");
      expect(out).not.toContain(HOME);
    });
  });

  test("a file:// frame outside repo and home becomes file://<external>/…", () => {
    withHome(HOME, () => {
      const out = redactStacktrace("    at boot (file:///usr/local/lib/loader.js:3:5)", REPO);
      expect(out).toContain("file://<external>/usr/local/lib/loader.js:3:5");
    });
  });

  test("rewriting a file:// frame is idempotent", () => {
    withHome(HOME, () => {
      const stack = `    at load (file://${HOME}/x.js:1:1)`;
      const once = redactStacktrace(stack, REPO);
      expect(redactStacktrace(once, REPO)).toBe(once);
    });
  });

  test("a Windows file:// URL drops the slash that precedes the drive letter", () => {
    withHome("C:\\Users\\dev", () => {
      const out = redactStacktrace("    at f (file:///C:/Users/dev/x.js:1:1)", "C:\\Users\\dev\\src\\amadeus");
      expect(out).toContain("file://<home>/x.js:1:1");
    });
  });
});

describe("URLs are not filesystem paths (r3696692658)", () => {
  // The optional drive letter matched ANY single letter before a colon, so the
  // "s" of "https:" was read as a drive and the URL came out corrupted. Since
  // exception.message now goes through this function, that reaches ordinary
  // error text ("fetch failed for https://…"), not just stack frames.
  test("an https URL passes through untouched", () => {
    withHome(HOME, () => {
      const stack = "Error: fetch failed for https://example.com/x";
      expect(redactStacktrace(stack, REPO)).toBe(stack);
    });
  });

  test("an http URL with port, path and query passes through untouched", () => {
    withHome(HOME, () => {
      const stack = "Error: GET http://localhost:3000/api?q=1 returned 500";
      expect(redactStacktrace(stack, REPO)).toBe(stack);
    });
  });

  test("a URL and a real path on the same line are treated differently", () => {
    withHome(HOME, () => {
      const out = redactStacktrace(`posted https://example.com/x from ${HOME}/tool.js`, REPO);
      expect(out).toContain("https://example.com/x");
      expect(out).toContain("<home>/tool.js");
      expect(out).not.toContain(HOME);
    });
  });

  test("a scheme-less token that merely follows a colon is still redacted", () => {
    // The regression this must not trade for: "Error:/Users/dev/secret.txt"
    // had its "r:" eaten as a drive letter, and the home path behind it was
    // then stored VERBATIM — a redaction failure, not a cosmetic one.
    withHome(HOME, () => {
      const out = redactStacktrace(`Error:${HOME}/secret.txt not found`, REPO);
      expect(out).toContain("<home>/secret.txt");
      expect(out).not.toContain(HOME);
    });
  });

  test("a drive letter is still detected at a real token boundary", () => {
    const WIN_HOME = "C:\\Users\\dev";
    withHome(WIN_HOME, () => {
      const out = redactStacktrace(`    at f (${WIN_HOME}\\app\\x.ts:1:1)`, "C:\\Users\\dev\\src\\amadeus");
      expect(out).toContain("<home>/app/x.ts:1:1");
      expect(out).not.toContain("Users");
    });
  });

  test("file:// is still rewritten — it names a local path, unlike http(s)", () => {
    withHome(HOME, () => {
      const out = redactStacktrace(`    at load (file://${HOME}/x.js:1:1)`, REPO);
      expect(out).toContain("file://<home>/x.js:1:1");
      expect(out).not.toContain(HOME);
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

// The elapsed ceilings in this block are super-linear blow-up guards, not
// performance claims: catastrophic backtracking on these fixtures runs for
// minutes, so the bound catches a regressed pattern with orders of magnitude to
// spare while leaving the linear path all the headroom a loaded box needs.
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

  // The same shape in the two forms added for r3695286229/r3695298662: a
  // backslash run behind a drive letter, and a slash run behind a scheme. Both
  // enter the same single-class-single-quantifier token, so both must scan once.
  function adversarialWindows(bytes: number): string {
    return `Error: boom\n    at f (C:${"\\aaa".repeat(Math.floor(bytes / 4))}`;
  }

  function adversarialFileUrl(bytes: number): string {
    return `Error: boom\n    at f (file://${"/aaa".repeat(Math.floor(bytes / 4))}`;
  }

  // A long alphanumeric run in front of the separator, which is what the
  // scheme check looks back over. Bounded lookback keeps it O(1) per match; a
  // scheme alternative inside the pattern would have re-scanned this run from
  // every start position instead.
  function adversarialSchemeish(bytes: number): string {
    return `Error: boom\n    at f (${"a".repeat(bytes)}://host/x`;
  }

  test("input-size sweep stays within a generous ceiling and keeps rewriting", () => {
    withHome(HOME, () => {
      for (const bytes of [12_500, 25_000, 50_000, 100_000]) {
        const input = adversarial(bytes);
        const startedAt = performance.now();
        const out = redactStacktrace(input, REPO);
        const elapsedMs = performance.now() - startedAt;
        expect(elapsedMs).toBeLessThanOrEqual(scaleTestTime(2_000));
        expect(out).toContain("<external>");
      }
    });
  }, scaleTestTime(30_000));

  test("the drive-letter and file:// forms scan in the same linear time", () => {
    withHome(HOME, () => {
      for (const build of [adversarialWindows, adversarialFileUrl]) {
        for (const bytes of [12_500, 25_000, 50_000, 100_000]) {
          const input = build(bytes);
          const startedAt = performance.now();
          const out = redactStacktrace(input, REPO);
          const elapsedMs = performance.now() - startedAt;
          expect(elapsedMs).toBeLessThanOrEqual(scaleTestTime(2_000));
          expect(out).toContain("<external>");
        }
      }
    });
  }, scaleTestTime(30_000));

  test("a long scheme-ish run in front of the separator stays linear", () => {
    // This fixture IS a URL by the scheme rule, so the assertion is that it
    // comes back untouched — and that the bounded lookback did not turn the
    // long run into per-start-position rescanning.
    withHome(HOME, () => {
      for (const bytes of [12_500, 25_000, 50_000, 100_000]) {
        const input = adversarialSchemeish(bytes);
        const startedAt = performance.now();
        const out = redactStacktrace(input, REPO);
        const elapsedMs = performance.now() - startedAt;
        expect(elapsedMs).toBeLessThanOrEqual(scaleTestTime(2_000));
        expect(out).toBe(input);
      }
    });
  }, scaleTestTime(30_000));

  test("a 100KB stack of real-looking frames is rewritten completely", () => {
    withHome(HOME, () => {
      const frame = `    at frame (${HOME}/deps/module/file.js:12:34)\n`;
      const lines = Math.ceil(100_000 / frame.length);
      const startedAt = performance.now();
      const out = redactStacktrace(`Error: boom\n${frame.repeat(lines)}`, REPO);
      const elapsedMs = performance.now() - startedAt;
      expect(elapsedMs).toBeLessThanOrEqual(scaleTestTime(2_000));
      expect(out).not.toContain(HOME);
      expect(out.split("<home>").length - 1).toBe(lines);
    });
  }, scaleTestTime(30_000));
});
