import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import {
  checkModelCompleteness,
  modelCompletenessTestSeams,
  updateModelMap,
} from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";

const roots: string[] = [];

function makeProject(entryCount = 1, bytesPerEntry = 32): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u5-integration-"));
  roots.push(root);
  mkdirSync(join(root, "scripts", "formal-verif"), { recursive: true });
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), {
    recursive: true,
  });
  const sourceRoot = join(import.meta.dir, "..", "..");
  for (const file of ["tla-model-map.ts", "canonical.ts", "contract.ts"]) {
    writeFileSync(
      join(root, "scripts", "formal-verif", file),
      readFileSync(join(sourceRoot, "scripts", "formal-verif", file)),
    );
  }
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), cfg);
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const suffix = entryCount === 1 ? "" : `-${String(index).padStart(4, "0")}`;
    const implPath = `packages/framework/core/tools/amadeus-election${suffix}.ts`;
    const body = Buffer.alloc(bytesPerEntry, index % 251);
    writeFileSync(join(root, implPath), body);
    return {
      implPath,
      sha256: Bun.CryptoHasher.hash("sha256", body, "hex"),
    };
  });
  writeFileSync(
    join(root, "specs", "tla", "model-map.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        model: {
          path: "specs/tla/FormalElection.tla",
          identity: canonicalIdentity(
            model,
            "amadeus.formal-verif.tla.module.v1",
          ).sha256,
        },
        cfg: {
          path: "specs/tla/FormalElection.cfg",
          identity: canonicalIdentity(
            cfg,
            "amadeus.formal-verif.tla.cfg.v1",
          ).sha256,
        },
        entries,
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("model-completeness sensor integration", () => {
  test("model変更後の明示updateをatomic publishし再checkがpassする", async () => {
    const root = makeProject(3);
    const modelPath = join(root, "specs", "tla", "FormalElection.tla");
    writeFileSync(modelPath, "---- MODULE FormalElection ----\nVARIABLE x\n====\n");
    expect(await checkModelCompleteness({ projectRoot: root })).toMatchObject({
      pass: false,
      reason: "drift",
    });
    expect(await updateModelMap({ projectRoot: root })).toEqual({
      ok: true,
      entries: 3,
      map: "specs/tla/model-map.json",
    });
    expect(await checkModelCompleteness({ projectRoot: root })).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
    });
    expect(
      JSON.parse(readFileSync(join(root, "specs", "tla", "model-map.json"), "utf-8"))
        .entries,
    ).toHaveLength(3);
  });

  test("model/cfg不変の自己認証更新を拒否しmapを保持する", async () => {
    const root = makeProject();
    const mapPath = join(root, "specs", "tla", "model-map.json");
    const before = readFileSync(mapPath);
    writeFileSync(
      join(root, "packages", "framework", "core", "tools", "amadeus-election.ts"),
      "implementation drift\n",
    );
    expect(await updateModelMap({ projectRoot: root })).toMatchObject({
      ok: false,
      code: "MODEL_UNCHANGED",
    });
    expect(readFileSync(mapPath)).toEqual(before);
  });

  test("lock競合を拒否する", async () => {
    const root = makeProject();
    mkdirSync(join(root, "specs", "tla", "model-map.json.lock"));
    expect(await updateModelMap({ projectRoot: root })).toMatchObject({
      ok: false,
      code: "LOCKED",
    });
  });

  test("2 updaterをread前lockで直列化しstale mapを再公開しない", async () => {
    const root = makeProject();
    const modelPath = join(root, "specs", "tla", "FormalElection.tla");
    writeFileSync(modelPath, "---- MODULE FormalElection ----\nVARIABLE x\n====\n");
    let enteredResolve: (() => void) | undefined;
    let releaseResolve: (() => void) | undefined;
    const entered = new Promise<void>((resolvePromise) => {
      enteredResolve = resolvePromise;
    });
    const release = new Promise<void>((resolvePromise) => {
      releaseResolve = resolvePromise;
    });
    const first = updateModelMap({
      projectRoot: root,
      dependencies: {
        loadCanonical: async (projectRoot) => {
          enteredResolve?.();
          await release;
          return modelCompletenessTestSeams.loadCanonicalFromProject(projectRoot);
        },
      },
    });
    await entered;
    const second = await updateModelMap({ projectRoot: root });
    expect(second).toMatchObject({ ok: false, code: "LOCKED" });
    releaseResolve?.();
    expect(await first).toMatchObject({ ok: true });
    const afterFirst = readFileSync(
      join(root, "specs", "tla", "model-map.json"),
    );
    expect(await updateModelMap({ projectRoot: root })).toMatchObject({
      ok: false,
      code: "MODEL_UNCHANGED",
    });
    expect(
      readFileSync(join(root, "specs", "tla", "model-map.json")),
    ).toEqual(afterFirst);
  });

  test("symlink対象を拒否し外部内容を開示しない", async () => {
    const root = makeProject();
    const impl = join(
      root,
      "packages",
      "framework",
      "core",
      "tools",
      "amadeus-election.ts",
    );
    rmSync(impl);
    const outside = join(root, "secret.ts");
    writeFileSync(outside, "top-secret");
    symlinkSync(outside, impl);
    const result = await checkModelCompleteness({ projectRoot: root });
    expect(result).toMatchObject({
      pass: false,
      findings: [{ reason: "symlink" }],
    });
    expect(JSON.stringify(result)).not.toContain("top-secret");
  });

  test("map/model/cfg symlinkを共通SafeFileReaderで拒否する", async () => {
    for (const relativePath of [
      "specs/tla/model-map.json",
      "specs/tla/FormalElection.tla",
      "specs/tla/FormalElection.cfg",
    ]) {
      const root = makeProject();
      const target = join(root, relativePath);
      const outside = join(root, `secret-${relativePath.split("/").at(-1)}`);
      writeFileSync(outside, "top-secret");
      rmSync(target);
      symlinkSync(outside, target);
      const result = await checkModelCompleteness({ projectRoot: root });
      expect(result).toMatchObject({
        pass: false,
        findings: [{ path: relativePath, reason: "symlink" }],
      });
      expect(JSON.stringify(result)).not.toContain("top-secret");
      const update = await updateModelMap({ projectRoot: root });
      expect(update).toMatchObject({
        ok: false,
        detail: `${relativePath}: symlink`,
      });
    }
  });

  test("map/model/cfgの16MiB上限を共通SafeFileReaderで拒否する", async () => {
    for (const relativePath of [
      "specs/tla/model-map.json",
      "specs/tla/FormalElection.tla",
      "specs/tla/FormalElection.cfg",
    ]) {
      const root = makeProject();
      writeFileSync(
        join(root, relativePath),
        Buffer.alloc(16 * 1024 * 1024 + 1),
      );
      const result = await checkModelCompleteness({ projectRoot: root });
      expect(result).toMatchObject({
        pass: false,
        findings: [{ path: relativePath, reason: "file-too-large" }],
      });
      const update = await updateModelMap({ projectRoot: root });
      expect(update).toMatchObject({
        ok: false,
        detail: `${relativePath}: file-too-large`,
      });
    }
  });

  test("16MiB超のentryをhash前に拒否する", async () => {
    const root = makeProject();
    const impl = join(
      root,
      "packages",
      "framework",
      "core",
      "tools",
      "amadeus-election.ts",
    );
    writeFileSync(impl, Buffer.alloc(16 * 1024 * 1024 + 1));
    const result = await checkModelCompleteness({ projectRoot: root });
    expect(result).toMatchObject({
      pass: false,
      findings: [{ reason: "file-too-large" }],
    });
  });

  test("1000 entryを入力順のまま全件処理する", async () => {
    const root = makeProject(1000, 8);
    const result = await checkModelCompleteness({ projectRoot: root });
    expect(result).toEqual({ pass: true, findings_count: 0, findings: [] });
  });

  test("100 entry・10MiBをwarm-up 2回後10回すべて10秒未満で処理する", async () => {
    const root = makeProject(100, Math.floor((10 * 1024 * 1024) / 100));
    await checkModelCompleteness({ projectRoot: root });
    await checkModelCompleteness({ projectRoot: root });
    const samples: number[] = [];
    for (let index = 0; index < 10; index++) {
      const start = performance.now();
      const result = await checkModelCompleteness({ projectRoot: root });
      samples.push(Number((performance.now() - start).toFixed(3)));
      expect(result.pass).toBe(true);
    }
    process.stdout.write(
      `U5_PERFORMANCE_RAW ${JSON.stringify({
        os: process.platform,
        arch: process.arch,
        bun: Bun.version,
        entries: 100,
        bytes: 10 * 1024 * 1024,
        samples_ms: samples,
        max_ms: Math.max(...samples),
      })}\n`,
    );
    expect(Math.max(...samples)).toBeLessThan(10_000);
  });
});
