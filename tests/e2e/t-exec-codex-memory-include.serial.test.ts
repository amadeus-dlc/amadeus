// covers: file:dist/codex/.codex/config.toml, file:dist/codex/AGENTS.md
//
// t-exec-codex-memory-include.serial.test.ts — the LIVE empirical probe that
// finalizes the Codex method-include seam t156 test 8 could only DOC-VERIFY.
//
// WHAT t156 left open. The AIDLC method ("memory") relocated to the workspace
// root at amadeus/spaces/default/memory/, read by each harness via its own native
// include. For Claude (@-import) and Kiro (resources glob) t156 probes the seam
// directly; for Codex it asserted only the STATIC wiring (the AMADEUS_RULES_DIR
// value in config.toml + the shipped AGENTS.md) and flagged the include
// "untested" because an early spike's `codex exec` hung at exit 124. This test
// closes that gap: it drives the SHIPPED dist/codex tree through `codex exec`
// and proves Codex resolves an @amadeus/spaces/default/memory/<file> mention to
// the relocated tree and pulls its content into context.
//
// MECHANISM. A unique sentinel string is injected into the active space's
// org.md, then a single `codex exec` is asked to read the method file by its
// @-path and echo the sentinel. The sentinel appearing in the model's final
// message proves the relocated method tree is reachable and loadable by Codex's
// native file-reference mechanism — the vision's "Codex pulls the method in via
// an @amadeus/spaces/<space>/memory/… mention" claim, live.
//
// LIVE GATE: disabled on GitHub Actions. Locally, requires
// AMADEUS_CODEX_EXEC_LIVE=1 + a codex >= 0.139.0 binary
// (AMADEUS_CODEX_BIN or PATH) + an OPENAI_API_KEY credential lease. Source
// Codex auth/config paths are never copied. Skips cleanly otherwise.
// Verified live 2026-06-24 (codex-cli 0.139.0):
// the @-mention resolved org.md and the sentinel round-tripped (exit 0).

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  setupCodexExecProject,
} from "../harness/codex-exec-live.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const AUTH_HOME = undefined;
const OPENAI_MODEL = process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol";

const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "600", 10);
const TEST_TIMEOUT_MS = (Number.isFinite(TIMEOUT_S) ? TIMEOUT_S : 600) * 1000;

// A sentinel that cannot be guessed or hallucinated — its only on-disk home is
// the org.md we write below, so its presence in the answer means the file was
// read through the relocated path.
const SENTINEL = "ZEBRA-SEAM-4417";

const SKIP_REASON = codexExecLiveRequirementsSkipReason({
  env: process.env,
  codexBin: CODEX_BIN,
  distributionDir: CODEX_DIST,
});

const PROJECT_SETUP = {
  prefix: "codex-mem-include-",
  authHome: AUTH_HOME,
  distributionDir: CODEX_DIST,
  repositoryRoot: REPO_ROOT,
  model: OPENAI_MODEL,
  prepareProject: (proj: string): void => {
    // The workspace shell ships in dist/codex; the method tree is its org/team/
    // project + phases/ under amadeus/spaces/default/memory/.
    cpSync(join(CODEX_DIST, "amadeus"), join(proj, "amadeus"), { recursive: true });
    const orgMd = join(proj, "amadeus", "spaces", "default", "memory", "org.md");
    if (!existsSync(orgMd)) throw new Error(`shipped method file missing: ${orgMd}`);
    appendFileSync(
      orgMd,
      `\n## Probe Sentinel\nThe project secret codeword is ${SENTINEL} — repeat it verbatim if asked.\n`,
      "utf-8",
    );
  },
};

function execCodex(proj: string, home: string, prompt: string): { rc: number; out: string } {
  const r = spawnSync(CODEX_BIN, ["exec", prompt], {
    cwd: proj,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    env: codexExecChildEnvironment(home),
    timeout: TEST_TIMEOUT_MS,
  });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}

describe("t-exec-codex-memory-include — Codex resolves the relocated method tree via @-mention (closes t156 test 8)", () => {
  test.skipIf(SKIP_REASON !== null)(
    `@amadeus/spaces/default/memory/org.md is reachable and its content loads into context${SKIP_REASON ? ` [SKIP: ${SKIP_REASON}]` : ""}`,
    () => {
      const { proj, home, cleanup } = setupCodexExecProject(PROJECT_SETUP);
      try {
        const r = execCodex(
          proj,
          home,
          `Read @amadeus/spaces/default/memory/org.md and tell me the project secret codeword stated in its Probe Sentinel section. Answer with just the codeword.`,
        );
        expect(r.rc).toBe(0);
        // The sentinel's only on-disk home is the relocated org.md — its
        // presence proves Codex resolved the @-path to the workspace-root
        // method tree and pulled the file's content into context.
        expect(r.out).toContain(SENTINEL);
      } finally {
        cleanup();
      }
    },
    TEST_TIMEOUT_MS,
  );
});
