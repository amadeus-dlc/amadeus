// covers: file:harness/codex/hooks/amadeus-codex-adapter.ts, file:harness/kiro/hooks/amadeus-kiro-adapter.ts, file:harness/kiro-ide/hooks/amadeus-kiro-adapter.ts
//
// t210 — the non-claude harness adapters (codex / kiro / kiro-ide) must classify
// their UserPromptSubmit payload BEFORE minting a HUMAN_TURN (issue #811).
//
// THE DEFECT. #755 (PR #766) added machine-injected-turn suppression to the CORE
// hook amadeus-mint-presence.ts (isMachineInjectedTurnText, a 5-marker catalog +
// leading-256-byte scan). But the three non-claude adapters mint inline via
// appendAuditEntry("HUMAN_TURN", …) and NEVER route their prompt through the
// classifier — so an agmsg-style machine-injected turn (teammate-message /
// task-notification) minted a phantom HUMAN_TURN on codex / kiro, poisoning the
// human-presence gate (#671 delegated-approval provenance) exactly where #755
// closed the hole on claude.
//
// THE CONTRACT this pins (mirrors the core mint hook's contract, t203):
//   - a machine-injected prompt (any MACHINE_INJECTED_TURN_MARKERS form) does
//     NOT mint HUMAN_TURN on any of the three adapters.
//   - a genuine human prompt mints exactly one HUMAN_TURN (non-regression).
//   - FAIL-OPEN: empty stdin / prompt-absent still MINTS — the same fail-open
//     the core hook uses (amadeus-mint-presence.ts:64). For kiro-ide this is the
//     PRODUCTION path (its stdin is empty on the real IDE, race-to-2s → ""), so
//     the classifier is inert there in production and the guard only bites when a
//     payload with a prompt body is actually delivered (constraint per #811).
//   - CANONICAL: the classifier is the shared lib export isMachineInjectedTurnText
//     — no marker catalog / logic is duplicated into any adapter (source sync
//     test below fixes this by reading the real adapter sources).
//
// WHY SUBPROCESS. The adapters ARE subprocess shims — spawning the SHIPPED dist
// adapter with a UserPromptSubmit payload on stdin and reading back the audit
// shard is the exact path the harness drives (same idiom as t149 / t203).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  intentsDirOf,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { MACHINE_INJECTED_TURN_MARKERS } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The three shipped adapters and how each is wired for the UserPromptSubmit mint.
// distTree is the harness dir under dist/<name>/ that carries the .* install tree.
const ADAPTERS = [
  {
    name: "codex",
    distTree: join(REPO_ROOT, "dist", "codex", ".codex"),
    installDir: ".codex",
    adapterRel: join(".codex", "hooks", "amadeus-codex-adapter.ts"),
    mintTarget: "mint",
    source: join(REPO_ROOT, "packages", "framework", "harness", "codex", "hooks", "amadeus-codex-adapter.ts"),
  },
  {
    name: "kiro",
    distTree: join(REPO_ROOT, "dist", "kiro", ".kiro"),
    installDir: ".kiro",
    adapterRel: join(".kiro", "hooks", "amadeus-kiro-adapter.ts"),
    mintTarget: "verb-intercept",
    source: join(REPO_ROOT, "packages", "framework", "harness", "kiro", "hooks", "amadeus-kiro-adapter.ts"),
  },
  {
    name: "kiro-ide",
    distTree: join(REPO_ROOT, "dist", "kiro-ide", ".kiro"),
    installDir: ".kiro",
    adapterRel: join(".kiro", "hooks", "amadeus-kiro-adapter.ts"),
    mintTarget: "mint",
    source: join(REPO_ROOT, "packages", "framework", "harness", "kiro-ide", "hooks", "amadeus-kiro-adapter.ts"),
  },
] as const;

// The four live-observed machine-injection forms (measured 2026-07-10, #755),
// derived from the shared catalog so a marker rename cannot leave a stale copy
// here. The preamble forms carry the trailing body the harness delivers, so the
// marker sits at offset>0 (leading-window detection).
const TASK_NOTIFICATION_FORM = `${MACHINE_INJECTED_TURN_MARKERS[0]}\ntask-id: abc123\n...`;
const TEAMMATE_TAG_FORM = `${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">assign task 1</teammate-message>`;
const TEAMMATE_PREAMBLE_FORM = `${MACHINE_INJECTED_TURN_MARKERS[2]}\n${MACHINE_INJECTED_TURN_MARKERS[1]} from="researcher">start on task #1</teammate-message>`;
const SYSTEM_NOTIFICATION_FORM = `${MACHINE_INJECTED_TURN_MARKERS[3]}\nAn event fired.\n<task-notification>event: build-done</task-notification>`;
const TEAM_MSG_FORM = `${MACHINE_INJECTED_TURN_MARKERS[4]}from:e3 via:herdr machine]\nack: received your dispatch`;
const CATALOG_FORMS: ReadonlyArray<readonly [string, string]> = [
  ["task-notification", TASK_NOTIFICATION_FORM],
  ["teammate-message tag", TEAMMATE_TAG_FORM],
  ["teammate-message preamble", TEAMMATE_PREAMBLE_FORM],
  ["system-notification preamble", SYSTEM_NOTIFICATION_FORM],
  ["team-msg herdr header", TEAM_MSG_FORM],
];

const PINNED_CLONE_ID = "testcloneid210";
function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.md`;
}

// Seed the per-intent workspace shell (mirrors fixtures.seedWorkspaceShell): the
// active-space / active-intent cursors + intents.json so appendAuditEntry can
// resolve the active intent's shard from cwd alone.
function seedShell(dir: string): void {
  const intentsDir = intentsDirOf(dir, DEFAULT_SPACE);
  mkdirSync(join(dir, "amadeus", "spaces", DEFAULT_SPACE, "memory"), { recursive: true });
  mkdirSync(seededRecordDir(dir), { recursive: true });
  writeFileSync(join(dir, "amadeus", "active-space"), `${DEFAULT_SPACE}\n`, "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${DEFAULT_RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [{ uuid: "00000000-0000-7000-8000-000000000001", slug: DEFAULT_RECORD_DIR.replace(/-[0-9a-f]+$/, ""), status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

// A scratch project: the harness install tree + the per-intent shell with an
// active workflow state (so the adapter's self-gate `existsSync(stateFilePath)`
// passes) + a pinned audit shard.
function scratchProject(distTree: string, installDir: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "t210-")));
  cpSync(distTree, join(dir, installDir), { recursive: true });
  seedShell(dir);
  writeFileSync(
    seededStateFile(dir),
    readFileSync(join(REPO_ROOT, "tests", "fixtures", "state-brownfield-feature.md"), "utf-8"),
  );
  writeFileSync(join(dir, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
  const auditDir = seededAuditDir(dir);
  mkdirSync(auditDir, { recursive: true });
  writeFileSync(join(auditDir, pinnedShardName()), "# AI-DLC Audit Log\n");
  return dir;
}

function humanTurnCount(dir: string): number {
  return eventCount(dir, "HUMAN_TURN");
}

function eventCount(dir: string, event: string): number {
  const auditDir = seededAuditDir(dir);
  let names: string[];
  try {
    names = readdirSync(auditDir);
  } catch {
    return 0;
  }
  return names
    .filter((n) => n.endsWith(".md"))
    .map((n) => readFileSync(join(auditDir, n), "utf-8"))
    .join("\n")
    .split("\n")
    .filter((l) => l === `**Event**: ${event}`).length;
}

// Fire the shipped adapter's mint target with the given stdin. `stdin` is the raw
// JSON string, or null to feed an empty pipe (the fail-open path).
function fireMint(dir: string, adapterRel: string, target: string, stdin: string | null): number {
  const r = spawnSync("bun", [join(dir, adapterRel), target], {
    cwd: dir,
    input: stdin ?? "",
    encoding: "utf-8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: undefined } as NodeJS.ProcessEnv,
    timeout: 30_000,
  });
  return r.status ?? -1;
}

function mintPayload(dir: string, prompt: string): string {
  return JSON.stringify({
    hook_event_name: "UserPromptSubmit",
    session_id: "sess-1",
    cwd: dir,
    prompt,
  });
}

function fireCodexState(dir: string, args: string[]): { rc: number; out: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, AMADEUS_SKIP_ARTIFACT_GUARD: "1" };
  delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  const r = spawnSync(
    "bun",
    [join(dir, ".codex", "tools", "amadeus-state.ts"), ...args, "--project-dir", dir],
    { cwd: dir, encoding: "utf-8", env, timeout: 30_000 },
  );
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("t210 non-claude adapters classify the UserPromptSubmit payload before minting (#811)", () => {
  for (const adapter of ADAPTERS) {
    describe(adapter.name, () => {
      // --- The bug: a machine-injected prompt must NOT mint HUMAN_TURN ---------
      // RED against the un-fixed adapter (it minted a phantom HUMAN_TURN, #811).
      // GREEN after each adapter routes the prompt through isMachineInjectedTurnText.
      for (const [formName, form] of CATALOG_FORMS) {
        test(`machine-injected ${formName} does NOT mint HUMAN_TURN`, () => {
          const dir = scratchProject(adapter.distTree, adapter.installDir);
          try {
            const rc = fireMint(dir, adapter.adapterRel, adapter.mintTarget, mintPayload(dir, form));
            expect(rc).toBe(0);
            expect(humanTurnCount(dir)).toBe(0);
          } finally {
            rmSync(dir, { recursive: true, force: true });
          }
        });
      }

      // --- Non-regression: a genuine human prompt still mints exactly one ------
      test("a genuine human prompt mints exactly one HUMAN_TURN", () => {
        const dir = scratchProject(adapter.distTree, adapter.installDir);
        try {
          const rc = fireMint(
            dir,
            adapter.adapterRel,
            adapter.mintTarget,
            mintPayload(dir, "please approve the feasibility gate"),
          );
          expect(rc).toBe(0);
          expect(humanTurnCount(dir)).toBe(1);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });

      // --- FAIL-OPEN: empty stdin / prompt-absent still mints -----------------
      // Mirrors the core hook's fail-open (amadeus-mint-presence.ts:64). For
      // kiro-ide this is the PRODUCTION path (real IDE stdin is empty).
      test("empty stdin FAILS OPEN — mints one HUMAN_TURN", () => {
        const dir = scratchProject(adapter.distTree, adapter.installDir);
        try {
          const rc = fireMint(dir, adapter.adapterRel, adapter.mintTarget, null);
          expect(rc).toBe(0);
          expect(humanTurnCount(dir)).toBe(1);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });

      test("prompt-absent payload FAILS OPEN — mints one HUMAN_TURN", () => {
        const dir = scratchProject(adapter.distTree, adapter.installDir);
        try {
          const rc = fireMint(
            dir,
            adapter.adapterRel,
            adapter.mintTarget,
            JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s", cwd: dir }),
          );
          expect(rc).toBe(0);
          expect(humanTurnCount(dir)).toBe(1);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    });
  }

  test("Codex prose approval mints one HUMAN_TURN and advances without QUESTION_ANSWERED", () => {
    const adapter = ADAPTERS[0];
    const dir = scratchProject(adapter.distTree, adapter.installDir);
    try {
      const mintRc = fireMint(
        dir,
        adapter.adapterRel,
        adapter.mintTarget,
        mintPayload(dir, "Approve"),
      );
      expect(mintRc).toBe(0);
      expect(eventCount(dir, "HUMAN_TURN")).toBe(1);
      expect(eventCount(dir, "QUESTION_ANSWERED")).toBe(0);

      const gate = fireCodexState(dir, ["gate-start", "requirements-analysis"]);
      expect(gate.rc).toBe(0);

      const approval = fireCodexState(dir, [
        "approve",
        "requirements-analysis",
        "--user-input",
        "Approve",
      ]);
      expect(approval.rc).toBe(0);
      expect(eventCount(dir, "HUMAN_TURN")).toBe(1);
      expect(eventCount(dir, "QUESTION_ANSWERED")).toBe(0);
      expect(eventCount(dir, "GATE_APPROVED")).toBe(1);

      const current = fireCodexState(dir, ["get", "Current Stage"]);
      expect(current.rc).toBe(0);
      expect(current.out.trim()).toBe("user-stories");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // --- Cross-adapter source sync (#821-style): every adapter mint site routes --
  //     its prompt through the SHARED lib classifier — no marker/logic duplication.
  //     Reads the REAL adapter sources so a future mint site cannot silently
  //     bypass the classifier (structural fail-toward-classification).
  describe("cross-adapter source sync — every inline mint routes through the shared classifier", () => {
    for (const adapter of ADAPTERS) {
      test(`${adapter.name} imports isMachineInjectedTurnText from the shared lib`, () => {
        const src = readFileSync(adapter.source, "utf-8");
        // Imported from ../tools/amadeus-lib.ts (the canonical single definition),
        // never re-declared locally (no duplicated catalog / logic).
        expect(src).toContain("isMachineInjectedTurnText");
        expect(/from "\.\.\/tools\/amadeus-lib\.ts"/.test(src)).toBe(true);
        expect(src).not.toContain("MACHINE_INJECTED_TURN_MARKERS =");
        expect(src).not.toContain("function isMachineInjectedTurnText");
      });

      test(`${adapter.name} guards its HUMAN_TURN mint with the classifier`, () => {
        const src = readFileSync(adapter.source, "utf-8");
        // Each source that mints a HUMAN_TURN must also reference the classifier —
        // the guard and the mint co-occur in the same adapter file.
        expect(src).toContain('appendAuditEntry("HUMAN_TURN"');
        expect(src).toContain("isMachineInjectedTurnText");
      });
    }
  });
});
