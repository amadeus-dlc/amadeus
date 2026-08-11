import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  checkModelCompleteness,
  main,
  modelCompletenessTestSeams,
  updateModelMap,
} from "../../plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts";

const roots: string[] = [];

function makeProject(entryCount = 2): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u6-impl-only-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus", "spaces", "default", "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  writeFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.cfg"), cfg);
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const implPath = `packages/framework/core/tools/amadeus-election-${index}.ts`;
    const body = `// implementation ${index}\n`;
    writeFileSync(join(root, implPath), body);
    return { implPath, sha256: Bun.CryptoHasher.hash("sha256", body, "hex") };
  });
  writeFileSync(
    join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        models: [
          {
            name: "FormalElection",
            model: {
              path: "amadeus/spaces/default/specs/tla/FormalElection.tla",
              identity: canonicalIdentity(model, "amadeus.formal-verif.tla.module.v1").sha256,
            },
            cfg: {
              path: "amadeus/spaces/default/specs/tla/FormalElection.cfg",
              identity: canonicalIdentity(cfg, "amadeus.formal-verif.tla.cfg.v1").sha256,
            },
            entries,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

function makeAuxProject(): string {
  const root = makeProject();
  const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
  const modelPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.tla");
  const corePath = join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElectionCore.tla");
  const model = "---- MODULE FormalElection ----\nCore == INSTANCE FormalElectionCore\n====\n";
  const core = "---- MODULE FormalElectionCore ----\nEXTENDS Naturals\n====\n";
  writeFileSync(modelPath, model);
  writeFileSync(corePath, core);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  map.models[0].model.identity = canonicalIdentity(
    model,
    "amadeus.formal-verif.tla.module.v1",
  ).sha256;
  map.models[0].auxiliaries = [{
    path: "amadeus/spaces/default/specs/tla/FormalElectionCore.tla",
    identity: canonicalIdentity(core, "amadeus.formal-verif.tla.module.v1").sha256,
  }];
  map.models[0].vocabulary = {
    namedInvariants: ["TypeOK"],
    traceStateVariables: ["state"],
  };
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  return root;
}

function recordedEntry(root: string, implPath: string): { implPath: string; sha256: string } {
  const map = JSON.parse(readFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"), "utf-8"));
  return map.models
    .flatMap((model: { entries: { implPath: string }[] }) => model.entries)
    .find((entry: { implPath: string }) => entry.implPath === implPath);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("updateModelMap --impl-only", () => {
  test("implementation-only drift is refreshed and recorded, and check returns to green", async () => {
    const root = makeProject();
    const drifted = "packages/framework/core/tools/amadeus-election-0.ts";
    const before = recordedEntry(root, drifted).sha256;
    writeFileSync(join(root, drifted), "// implementation 0 revised\n");

    expect(await checkModelCompleteness({ projectRoot: root })).toMatchObject({
      pass: false,
      reason: "drift",
    });

    const result = await updateModelMap({ projectRoot: root, implOnly: true });
    expect(result).toMatchObject({
      ok: true,
      code: "IMPL_ONLY_UPDATED",
      declared: "impl-only",
      map: "amadeus/spaces/default/specs/tla/model-map.json",
    });

    const after = recordedEntry(root, drifted).sha256;
    expect(after).not.toEqual(before);
    expect(result).toMatchObject({
      changed: [{ implPath: drifted, from: before.slice(0, 12), to: after.slice(0, 12) }],
    });

    expect(await checkModelCompleteness({ projectRoot: root })).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
    });
  });

  test("a changed model is refused and the map is left untouched", async () => {
    const root = makeProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.tla"),
      "---- MODULE FormalElection ----\nVARIABLE x\n====\n",
    );
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    const result = await updateModelMap({ projectRoot: root, implOnly: true });
    expect(result).toMatchObject({ ok: false, code: "INVALID_ARGUMENT" });
    expect((result as { detail: string }).detail).toContain("updateModelMap");
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("a changed configuration is refused and the map is left untouched", async () => {
    const root = makeProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.cfg"), "SPECIFICATION Other\n");

    expect(await updateModelMap({ projectRoot: root, implOnly: true })).toMatchObject({
      ok: false,
      code: "INVALID_ARGUMENT",
    });
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("an --impl-only run without drift is refused instead of republishing", async () => {
    const root = makeProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);

    expect(await updateModelMap({ projectRoot: root, implOnly: true })).toMatchObject({
      ok: false,
      code: "MODEL_UNCHANGED",
      detail: "amadeus/spaces/default/specs/tla/model-map.json: impl-unchanged",
    });
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("the flagless success shape is unchanged by the new branch", async () => {
    const root = makeProject(3);
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElection.tla"),
      "---- MODULE FormalElection ----\nVARIABLE x\n====\n",
    );

    expect(await updateModelMap({ projectRoot: root })).toEqual({
      ok: true,
      entries: 3,
      map: "amadeus/spaces/default/specs/tla/model-map.json",
    });
  });

  test("the flagless refusal points at the --impl-only recovery step", async () => {
    const root = makeProject();
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    const result = await updateModelMap({ projectRoot: root });
    expect(result).toMatchObject({ ok: false, code: "MODEL_UNCHANGED" });
    expect((result as { detail: string }).detail).toContain("--impl-only");
  });

  test("an entry that stops being readable after the drift decision fails closed", async () => {
    const root = makeProject();
    const drifted = "packages/framework/core/tools/amadeus-election-0.ts";
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(join(root, drifted), "// implementation 0 revised\n");

    // The drift decision and the republished entries are separate reads; the
    // second one is what a concurrent delete would hit.
    const seen = new Set<string>();
    const result = await updateModelMap({
      projectRoot: root,
      implOnly: true,
      dependencies: {
        readFile: (rootReal, relativePath, totalBefore) => {
          if (relativePath === drifted && seen.has(relativePath)) {
            return { finding: { path: relativePath, reason: "missing" }, bytes: 0 };
          }
          seen.add(relativePath);
          return modelCompletenessTestSeams.safeReadFile(rootReal, relativePath, totalBefore);
        },
      },
    });

    expect(result).toMatchObject({ ok: false, code: "UPDATE_FAILED" });
    expect((result as { detail: string }).detail).toContain("missing");
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("a failing publish is reported instead of being swallowed", async () => {
    const root = makeProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    const result = await updateModelMap({
      projectRoot: root,
      implOnly: true,
      dependencies: {
        publish: () => {
          throw new Error("publish refused");
        },
      },
    });

    expect(result).toMatchObject({ ok: false, code: "UPDATE_FAILED" });
    expect((result as { detail: string }).detail).toContain("publish-failed");
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("the CLI accepts --impl-only on updateModelMap and refuses it on check", async () => {
    const root = makeProject();
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    let updateCode: number;
    let checkCode: number;
    try {
      updateCode = await main(["updateModelMap", "--impl-only", "--project-dir", root]);
      checkCode = await main(["--impl-only", "--project-dir", root]);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(updateCode).toBe(0);
    expect(JSON.parse(chunks[0] as string)).toMatchObject({
      ok: true,
      code: "IMPL_ONLY_UPDATED",
      declared: "impl-only",
    });
    expect(checkCode).toBe(2);
    expect(JSON.parse(chunks[1] as string)).toMatchObject({
      ok: false,
      code: "INVALID_ARGUMENT",
    });
  });

  test("a changed auxiliary is refused and the map is left untouched", async () => {
    const root = makeAuxProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "specs", "tla", "FormalElectionCore.tla"),
      "---- MODULE FormalElectionCore ----\nEXTENDS Integers\n====\n",
    );
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    expect(await updateModelMap({ projectRoot: root, implOnly: true })).toMatchObject({
      ok: false,
      code: "INVALID_ARGUMENT",
    });
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("a declaration mismatch is refused instead of publishing an entries-only half update", async () => {
    const root = makeAuxProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    delete map.models[0].auxiliaries;
    writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
    const before = readFileSync(mapPath);
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    expect(await updateModelMap({ projectRoot: root, implOnly: true })).toMatchObject({
      ok: false,
      code: "INVALID_ARGUMENT",
    });
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("an entries-only update preserves model, cfg, auxiliaries, and vocabulary", async () => {
    const root = makeAuxProject();
    const mapPath = join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");
    const before = JSON.parse(readFileSync(mapPath, "utf8"));
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election-0.ts"),
      "// implementation 0 revised\n",
    );

    expect(await updateModelMap({ projectRoot: root, implOnly: true })).toMatchObject({
      ok: true,
      code: "IMPL_ONLY_UPDATED",
    });
    const after = JSON.parse(readFileSync(mapPath, "utf8"));
    for (const field of ["model", "cfg", "auxiliaries", "vocabulary"] as const) {
      expect(after.models[0][field]).toEqual(before.models[0][field]);
    }
    expect(after.models[0].entries).not.toEqual(before.models[0].entries);
  });
});
