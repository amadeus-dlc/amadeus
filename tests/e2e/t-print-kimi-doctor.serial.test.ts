// covers: file:skills/amadeus/SKILL.md
//
// t-print-kimi-doctor.serial.test.ts — drive `/skill:amadeus --doctor`
// through the Kimi Code CLI's headless surface (`kimi -p`) against the SHIPPED
// dist/kimi tree, and assert on the kimi doctor arm's real rows (FR-9a,
// journey 2). The assertions ride the two DETERMINISTIC wiring states of
// business-logic-model.md §hermeticity:
//
//   (a) unwired — a tmp KIMI_CODE_HOME whose config.toml carries only
//       `default_model` and no managed block. (A config-LESS home cannot run
//       this journey at all: kimi refuses to start a session without
//       default_model — verified 2026-07-26, "No model configured". The
//       business-logic-model.md "(a) managed block 未配線" state is therefore
//       realized as config-without-block.) The doctor arm deterministically
//       reports the managed-block hint (`kimi managed block: not found in
//       <home>/config.toml — hooks not wired`, naming
//       amadeus-hooks.snippet.toml as the manual source).
//   (b) seeded — the tmp home's config.toml additionally carries the managed
//       block applied by Bolt 3's production merge module (runHooksMerge
//       against the real snippet master, auto-confirm tty). The arm's
//       adapter / managed-block / CLI-version rows pass. The functional hook
//       probe is ADVISORY and is not part of the pass assertions (per the
//       plan).
//
// Both states were verified deterministically ahead of this journey by running
// `bun .kimi-code/tools/amadeus-utility.ts doctor` from an identical tmp
// install (no credits): (a) prints the not-found/hint row, (b) prints the
// three ✓ rows asserted below.
//
// HERMETICITY (BR-2): the project is a tmp copy of dist/kimi and
// KIMI_CODE_HOME points at a tmp home; the merge touches only that tmp
// config. Auth reaches the tmp home via symlinked credentials entries only —
// never a copy (see the driver's AUTH LOCATION note).
//
// LIVE GATE: requires AMADEUS_KIMI_PRINT_LIVE=1 + a kimi binary
// (AMADEUS_KIMI_BIN or PATH). SPENDS Kimi credits — exactly two short print
// sessions per run, one per state (CC-1). Skips cleanly otherwise.

import { describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runHooksMerge,
} from "../../packages/setup/src/modules/kimi-hooks.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite } from "../../packages/setup/src/ports/fsops.ts";
import {
  KIMI_DIST,
  prepareKimiHome,
  runPrintSession,
  skipReason,
  writeKimiConfig,
} from "../harness/kimi-print-drive.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SNIPPET_MASTER = join(
  HERE,
  "..",
  "..",
  "packages",
  "framework",
  "harness",
  "kimi",
  "hooks",
  "amadeus-hooks.snippet.toml",
);

const SKIP_REASON = skipReason();

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

// Same scratch install as the status journey: the tmp config.toml carries
// only `default_model` (kimi won't start a session without one). State (a)
// leaves it block-less; state (b) merges the managed block into it.
function setupKimiProject(): { proj: string; home: string; root: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kimi-print-doctor-")));
  const proj = join(root, "proj");
  const home = join(root, "kimi-home");
  cpSync(join(KIMI_DIST, ".kimi-code"), join(proj, ".kimi-code"), { recursive: true });
  cpSync(join(KIMI_DIST, "amadeus"), join(proj, "amadeus"), { recursive: true });
  cpSync(join(KIMI_DIST, "AGENTS.md"), join(proj, "AGENTS.md"));
  prepareKimiHome(home);
  writeKimiConfig(home);
  return { proj, home, root };
}

// State (b) seeding: Bolt 3's runHooksMerge with the REAL snippet master and
// REAL fs ports against the tmp KimiHome; the tty auto-confirms so the merge
// applies exactly as an interactive install would.
async function seedManagedBlock(home: string): Promise<void> {
  const result = await runHooksMerge(
    {
      snippet: readFileSync(SNIPPET_MASTER, "utf8"),
      snippetSource: ".kimi-code/hooks/amadeus-hooks.snippet.toml",
      interactive: true,
      kimiHome: home,
    },
    {
      tty: {
        isTTY: true,
        select: () => Promise.reject(new Error("unexpected tty.select")),
        input: () => Promise.reject(new Error("unexpected tty.input")),
        confirm: () => Promise.resolve(true),
      },
      fsRead: createFsRead(),
      fsWrite: createFsWrite(),
      applyWrite: createApplyWrite(),
      out: () => {},
    },
  );
  if (result.type === "err") {
    throw new Error(`managed-block seed must apply: ${result.error.detail}`);
  }
  if (result.value.type !== "applied") {
    throw new Error(`managed-block seed must apply, got ${result.value.type}`);
  }
}

async function runDoctor(proj: string, home: string) {
  return runPrintSession({
    cwd: proj,
    prompt: "/skill:amadeus --doctor",
    env: { KIMI_CODE_HOME: home },
  });
}

describe("t-print-kimi-doctor — /skill:amadeus --doctor on the shipped dist/kimi via kimi -p", () => {
  test.skipIf(SKIP_REASON !== null)(
    `(a) unwired: doctor reports the managed-block hint${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const { proj, home, root } = setupKimiProject();
      try {
        const r = await runDoctor(proj, home);
        expect(r.error).toBeUndefined();
        expect(r.timedOut).toBe(false);
        expect(r.rc).toBe(0);
        // The arm's fail row + the wiring hint (deterministic state (a)).
        expect(r.out).toContain("kimi managed block:");
        expect(r.out).toContain("not found");
        expect(r.out).toContain("hooks not wired");
        expect(r.out).toContain("amadeus-hooks.snippet.toml");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    TEST_TIMEOUT_MS,
  );

  test.skipIf(SKIP_REASON !== null)(
    `(b) seeded: adapter / managed-block / version rows pass (probe advisory-excluded)${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    async () => {
      const { proj, home, root } = setupKimiProject();
      try {
        await seedManagedBlock(home);
        const r = await runDoctor(proj, home);
        expect(r.error).toBeUndefined();
        expect(r.timedOut).toBe(false);
        expect(r.rc).toBe(0);
        expect(r.out).toContain("amadeus-kimi-adapter.ts present");
        expect(r.out).toContain("kimi managed block: present");
        expect(r.out).toMatch(/kimi CLI (version \d+\.\d+\.\d+ >= 0\.28\.1|on PATH)/);
        // The functional hook probe ("kimi hook probe:") is advisory by design
        // and intentionally carries no assertion here.
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    TEST_TIMEOUT_MS,
  );
});
