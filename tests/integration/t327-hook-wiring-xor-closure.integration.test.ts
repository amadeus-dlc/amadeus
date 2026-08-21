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
// the adapter-native faces use their lifecycle integrations. Read from source
// so dist staleness cannot mask a missing trigger.
const WIRING_SITE: Record<PackageHarness, string> = {
  claude: "packages/framework/harness/claude/settings.json.example",
  codex: "packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts",
  cursor: "packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts",
  kimi: "packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts",
  kiro: "packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts",
  "kiro-ide": "packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts",
  opencode: "packages/framework/harness/opencode/plugins/amadeus-opencode-plugin.ts",
  pi: "packages/framework/harness/pi/extensions/amadeus-pi-extension.ts",
};

const HARNESS_DIR: Record<PackageHarness, string> = {
  claude: ".claude",
  codex: ".codex",
  cursor: ".cursor",
  kimi: ".kimi-code",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
  opencode: ".opencode",
  pi: ".pi",
};

function siteContainsCompose(harness: PackageHarness, relPath: string): boolean {
  const source = readFileSync(join(REPO_ROOT, relPath), "utf-8");
  return harness === "opencode"
    ? source.includes('handlePluginCli(["compose", "--if-stale"')
    : source.includes(COMPOSE_HOOK);
}

describe("t327 hook wiring XOR closure (U4)", () => {
  // The structural heart of BR-U4-4: every face is wired XOR degraded, and the
  // arm's obligation holds. No face is silently neither.
  test("every face is wired XOR degraded with its obligation met (REL-U4-1)", () => {
    for (const h of PACKAGE_HARNESSES) {
      const d = resolveFaceDisposition(h);
      if (d.kind === "wired") {
        const site = WIRING_SITE[h];
        expect(site, `wired face ${h} has a declared wiring site`).toBeDefined();
        expect(siteContainsCompose(h, site), `wired face ${h}: ${site} invokes auto-compose`).toBe(true);
      } else {
        // Degraded: no auto-compose wiring, and the manual floor is documented.
        const doc = installDoc("conformance-fixture", HARNESS_DIR[h], "manual-only");
        expect(doc, `degraded face ${h}: INSTALL documents the manual compose floor`).toContain(
          "no auto-compose session hook",
        );
        expect(doc).toContain(`bun ${HARNESS_DIR[h]}/tools/amadeus-plugin.ts compose`);
      }
    }
  });

  test("opencode plugin source wires native session.created auto-compose", () => {
    const oc = resolveFaceDisposition("opencode");
    expect(oc.kind).toBe("wired");
    const src = readFileSync(
      join(REPO_ROOT, "packages/framework/harness/opencode/plugins/amadeus-opencode-plugin.ts"),
      "utf-8",
    );
    expect(src.includes('handlePluginCli(["compose", "--if-stale"')).toBe(true);
    expect(src.includes("isOpencodeSessionCreatedEvent")).toBe(true);
  });

  // The degraded face's doctorVisibility (domain-entities.md): an advisory
  // DropsRecord entry is rendered as a visible doctor line — silent skip is
  // impossible. This reuses U5's projection (shared with BR-U5-2(a)); U4 owns no
  // write, only the contract that the advisory, WHEN recorded, surfaces.
  test("advisory DropsRecord entry renders as a visible doctor line (degrade visibility, shared U5 BR-U5-2a)", () => {
    const drops: DropsRecord = {
      plugins: new Map([
        [
          "conformance-fixture",
          [{ surface: "auto-compose-trigger", severity: "advisory", reason: "opencode has no session-start hook" }],
        ],
      ]),
    };
    const section = buildDoctorPluginSection({ diagnostics: [], drops, revision: 1 });
    const line = section.lines.find((l) => l.state === "advisory" && l.detail.includes("auto-compose-trigger"));
    expect(line, "the advisory degrade entry is a visible doctor line").toBeDefined();
    // advisory is visible-but-passing (not a FAIL) — degrade is not breakage.
    expect(line?.plugin).toBe("conformance-fixture");
  });
});
