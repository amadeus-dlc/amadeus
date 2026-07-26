// covers: file:tests/harness/kimi-print-drive.ts
//
// t-kimi-print-drive — deterministic unit checks for the kimi print driver's
// logic halves (Bolt 6, FR-9b Step 4): the skipReason gate branches, spawn
// failure / timeout handling, and the prepareKimiHome auth-supply mechanism
// (symlink, never a copy). No live kimi session anywhere in this file — the
// "binary" is process.execPath (bun), whose `--version` exits 0 and whose
// `-p 'await Bun.sleep(...)'` hangs on cue, so every branch is exercised
// without spending credits.

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultJourneyModel,
  prepareKimiHome,
  runPrintSession,
  skipReason,
  writeKimiConfig,
} from "../harness/kimi-print-drive.ts";

const roots: string[] = [];
function root(tag: string): string {
  const created = mkdtempSync(join(tmpdir(), `kimi-print-drive-${tag}-`));
  roots.push(created);
  return created;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true });
});

describe("skipReason — the live-gate branches (BR-1)", () => {
  test("gate env unset → reason names AMADEUS_KIMI_PRINT_LIVE", () => {
    const reason = skipReason({});
    expect(reason).toContain("AMADEUS_KIMI_PRINT_LIVE=1");
  });

  test("gate set to something other than '1' → still a reason", () => {
    expect(skipReason({ AMADEUS_KIMI_PRINT_LIVE: "true" })).toContain("AMADEUS_KIMI_PRINT_LIVE=1");
  });

  test("gate on but binary missing → reason names the binary", () => {
    const reason = skipReason({
      AMADEUS_KIMI_PRINT_LIVE: "1",
      AMADEUS_KIMI_BIN: join(root("nobin"), "no-such-kimi"),
    });
    expect(reason).toContain("kimi binary not found");
  });

  test("gate on + binary present + dist/kimi shipped → null (the live arm)", () => {
    // process.execPath (bun) answers `--version` with exit 0 — a portable
    // stand-in for a resolvable kimi binary.
    expect(
      skipReason({ AMADEUS_KIMI_PRINT_LIVE: "1", AMADEUS_KIMI_BIN: process.execPath }),
    ).toBeNull();
  });
});

describe("runPrintSession — spawn failure handling (deterministic parts)", () => {
  test("a missing binary resolves rc -1 with the spawn error recorded, never throws", async () => {
    const r = await runPrintSession({
      cwd: root("enoent"),
      prompt: "anything",
      bin: join(root("enoent-bin"), "no-such-kimi"),
    });
    expect(r.rc).toBe(-1);
    expect(r.timedOut).toBe(false);
    expect(r.error).toBeDefined();
  });

  test("a hanging session is killed at the explicit timeout and marked timedOut", async () => {
    const r = await runPrintSession({
      cwd: root("timeout"),
      // bun -p 'await Bun.sleep(...)' never exits on its own.
      prompt: "await Bun.sleep(10000)",
      bin: process.execPath,
      timeoutMs: 500,
    });
    expect(r.timedOut).toBe(true);
    expect(r.rc).toBe(-1);
  }, 15000);

  test("a succeeding session carries stdout and exit 0", async () => {
    const r = await runPrintSession({
      cwd: root("ok"),
      prompt: "'engine-output-123'",
      bin: process.execPath,
      timeoutMs: 15000,
    });
    expect(r.error).toBeUndefined();
    expect(r.timedOut).toBe(false);
    expect(r.rc).toBe(0);
    expect(r.out).toContain("engine-output-123");
  }, 30000);
});

describe("writeKimiConfig — the minimal managed config kimi startup requires", () => {
  test("writes default_model + managed provider + model entry, no credential material", () => {
    const home = join(root("cfg"), "home");
    writeKimiConfig(home, "k3");
    const text = readFileSync(join(home, "config.toml"), "utf-8");
    expect(text).toContain('default_model = "kimi-code/k3"');
    expect(text).toContain('[providers."managed:kimi-code"]');
    expect(text).toContain('api_key = ""'); // OAuth fills auth, never a key
    expect(text).toContain('[models."kimi-code/k3"]');
    expect(text).toContain('model = "k3"');
    Bun.TOML.parse(text); // the seeded config must stay valid TOML
  });

  test("the model defaults to k3 and AMADEUS_KIMI_MODEL overrides (id or alias)", () => {
    expect(defaultJourneyModel({})).toBe("k3");
    expect(defaultJourneyModel({ AMADEUS_KIMI_MODEL: "kimi-for-coding" })).toBe("kimi-for-coding");
    expect(defaultJourneyModel({ AMADEUS_KIMI_MODEL: "kimi-code/k3-256k" })).toBe("k3-256k");
  });
});

describe("prepareKimiHome — auth supply without copying (security-design.md)", () => {
  test("symlinks credentials + oauth from the real home; copies no bytes", () => {
    const real = root("real");
    mkdirSync(join(real, "credentials"), { recursive: true });
    mkdirSync(join(real, "oauth"), { recursive: true });
    writeFileSync(join(real, "credentials", "kimi-code.json"), "{}");
    const home = join(root("tmp"), "home");

    prepareKimiHome(home, real);

    const cred = lstatSync(join(home, "credentials"));
    const oauth = lstatSync(join(home, "oauth"));
    expect(cred.isSymbolicLink()).toBe(true);
    expect(oauth.isSymbolicLink()).toBe(true);
  });

  test("a real home without credential entries gets no links and no error", () => {
    const real = root("real-empty");
    const home = join(root("tmp2"), "home");
    prepareKimiHome(home, real);
    expect(existsSync(join(home, "credentials"))).toBe(false);
    expect(existsSync(join(home, "oauth"))).toBe(false);
  });

  test("idempotent: a second call over the same tmp home does not throw", () => {
    const real = root("real3");
    mkdirSync(join(real, "credentials"), { recursive: true });
    const home = join(root("tmp3"), "home");
    prepareKimiHome(home, real);
    expect(() => prepareKimiHome(home, real)).not.toThrow();
  });

  test("source === home is a no-op (never links a home into itself)", () => {
    const home = root("same");
    prepareKimiHome(home, home);
    expect(existsSync(join(home, "credentials"))).toBe(false);
  });
});
