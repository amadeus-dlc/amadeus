// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U4 hook-wiring-remaining — the XOR全数 closure (reliability-design.md
// REL-U4-1 / BR-U4-4). For EVERY face in the U1 matrix enumeration, assert it
// lands in exactly one arm and that arm's obligation actually holds:
//   - wired    → an amadeus-plugin-compose invocation exists at its wiring point
//                (the harness source that dispatches session-start).
//   - degraded → NO compose wiring, AND the DegradeContract exists: the manual
//                compose floor documented in INSTALL (installDoc) plus the
//                doctor advisory line (shared with U5 BR-U5-2(a)).
// The wiring points are read from real source (not dist) so a missing wiring is
// caught here rather than surfacing as a silent auto-compose gap at runtime.
// Reads repo source files → medium/integration tier (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDoctorPluginSection } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import type { DropsRecord } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  installDoc,
  PACKAGE_HARNESSES,
  type PackageHarness,
  resolveFaceDisposition,
} from "../../scripts/plugin-projection.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMPOSE_HOOK = "amadeus-plugin-compose";

// Where each WIRED face dispatches auto-compose (the source file that must
// carry the 1-point compose invocation). claude's is the U2 settings wiring;
// the other five are U4's adapter wiring. Read from source — no dist staleness.
const WIRING_SITE: Record<Exclude<PackageHarness, "opencode">, string> = {
  claude: "packages/framework/harness/claude/settings.json.example",
  codex: "packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts",
  cursor: "packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts",
  kimi: "packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts",
  kiro: "packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts",
  "kiro-ide": "packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts",
};

const HARNESS_DIR: Record<PackageHarness, string> = {
  claude: ".claude",
  codex: ".codex",
  cursor: ".cursor",
  kimi: ".kimi-code",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
  opencode: ".opencode",
};

function siteContainsCompose(relPath: string): boolean {
  return readFileSync(join(REPO_ROOT, relPath), "utf-8").includes(COMPOSE_HOOK);
}

describe("t327 hook wiring XOR closure (U4)", () => {
  // The structural heart of BR-U4-4: every face is wired XOR degraded, and the
  // arm's obligation holds. No face is silently neither.
  test("every face is wired XOR degraded with its obligation met (REL-U4-1)", () => {
    for (const h of PACKAGE_HARNESSES) {
      const d = resolveFaceDisposition(h);
      if (d.kind === "wired") {
        const site = WIRING_SITE[h as Exclude<PackageHarness, "opencode">];
        expect(site, `wired face ${h} has a declared wiring site`).toBeDefined();
        expect(siteContainsCompose(site), `wired face ${h}: ${site} invokes ${COMPOSE_HOOK}`).toBe(true);
      } else {
        // Degraded: no auto-compose wiring, and the manual floor is documented.
        const doc = installDoc("formal-model-check", HARNESS_DIR[h], "manual-only");
        expect(doc, `degraded face ${h}: INSTALL documents the manual compose floor`).toContain(
          "no auto-compose session hook",
        );
        expect(doc).toContain(`bun ${HARNESS_DIR[h]}/tools/amadeus-plugin.ts compose`);
      }
    }
  });

  // The degraded face (opencode) carries NO compose wiring in its plugin source —
  // the fail-closed manual-only class must not accidentally auto-fire.
  test("opencode plugin source carries no auto-compose wiring (BR-U1-6 fail-closed)", () => {
    const oc = resolveFaceDisposition("opencode");
    expect(oc.kind).toBe("degraded");
    const src = readFileSync(
      join(REPO_ROOT, "packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts"),
      "utf-8",
    );
    expect(src.includes(COMPOSE_HOOK)).toBe(false);
    expect(src.includes("compose --if-stale")).toBe(false);
  });

  // The degraded face's doctorVisibility (domain-entities.md): an advisory
  // DropsRecord entry is rendered as a visible doctor line — silent skip is
  // impossible. This reuses U5's projection (shared with BR-U5-2(a)); U4 owns no
  // write, only the contract that the advisory, WHEN recorded, surfaces.
  test("advisory DropsRecord entry renders as a visible doctor line (degrade visibility, shared U5 BR-U5-2a)", () => {
    const drops: DropsRecord = {
      plugins: new Map([
        [
          "formal-model-check",
          [{ surface: "auto-compose-trigger", severity: "advisory", reason: "opencode has no session-start hook" }],
        ],
      ]),
    };
    const section = buildDoctorPluginSection({ diagnostics: [], drops, revision: 1, activation: null });
    const line = section.lines.find((l) => l.state === "advisory" && l.detail.includes("auto-compose-trigger"));
    expect(line, "the advisory degrade entry is a visible doctor line").toBeDefined();
    // advisory is visible-but-passing (not a FAIL) — degrade is not breakage.
    expect(line?.plugin).toBe("formal-model-check");
  });
});
