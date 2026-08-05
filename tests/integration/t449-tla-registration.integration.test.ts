import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { updateModelMap } from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";

// U4 handler pin (nfr-design/logical-components.md § 層構成): the committer and
// the completeness sensor both touch the real filesystem, so these live in the
// integration tier (cid:code-generation:fs-tests-integration-first).

const BUNDLE_DIGEST = `sha256:${"e".repeat(64)}`;

const roots: string[] = [];

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u4-registration-"));
  roots.push(root);
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), cfg);
  const implPath = "packages/framework/core/tools/amadeus-election-0.ts";
  const body = "// implementation 0\n";
  writeFileSync(join(root, implPath), body);
  writeFileSync(
    join(root, "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        models: [
          {
            name: "FormalElection",
            model: {
              path: "specs/tla/FormalElection.tla",
              identity: canonicalIdentity(model, "amadeus.formal-verif.tla.module.v1").sha256,
            },
            cfg: {
              path: "specs/tla/FormalElection.cfg",
              identity: canonicalIdentity(cfg, "amadeus.formal-verif.tla.cfg.v1").sha256,
            },
            entries: [{ implPath, sha256: Bun.CryptoHasher.hash("sha256", body, "hex") }],
            evidenceBundle: { digest: BUNDLE_DIGEST },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

function readMap(root: string): { models: { evidenceBundle?: { digest: string } }[] } {
  return JSON.parse(readFileSync(join(root, "specs", "tla", "model-map.json"), "utf8"));
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("completeness sensor round-trip (BR-U4-12)", () => {
  test("an impl-only refresh keeps the registered evidenceBundle reference", async () => {
    const root = makeProject();
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    const result = await updateModelMap({ projectRoot: root, implOnly: true });
    expect(result).toMatchObject({ ok: true, code: "IMPL_ONLY_UPDATED" });
    expect(readMap(root).models[0]?.evidenceBundle).toEqual({ digest: BUNDLE_DIGEST });
  });
});
