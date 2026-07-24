import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import {
  diffModelMap,
  parseTlaModelMap,
  type ModelMapEntry,
} from "../../scripts/formal-verif/tla-model-map.ts";
import {
  checkModelCompleteness,
  main,
  modelCompletenessTestSeams,
  updateModelMap,
} from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";

const roots: string[] = [];
const encoder = new TextEncoder();

function identity(source: string, domain: string): string {
  return canonicalIdentity(source, domain).sha256;
}

function fixture(entryCount = 1): {
  root: string;
  entries: ModelMapEntry[];
  mapPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "amadeus-u5-unit-"));
  roots.push(root);
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), {
    recursive: true,
  });
  const model = "---- MODULE FormalElection ----\n====\n";
  const cfg = "SPECIFICATION Spec\n";
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), model);
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), cfg);
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const suffix = entryCount === 1 ? "" : `-${String(index).padStart(4, "0")}`;
    const implPath = `packages/framework/core/tools/amadeus-election${suffix}.ts`;
    const body = `export const value${index} = ${index};\n`;
    writeFileSync(join(root, implPath), body);
    return {
      implPath,
      sha256: Bun.CryptoHasher.hash("sha256", body, "hex"),
    };
  });
  const map = {
    schemaVersion: 1,
    model: {
      path: "specs/tla/FormalElection.tla",
      identity: identity(model, "amadeus.formal-verif.tla.module.v1"),
    },
    cfg: {
      path: "specs/tla/FormalElection.cfg",
      identity: identity(cfg, "amadeus.formal-verif.tla.cfg.v1"),
    },
    entries,
  };
  const mapPath = join(root, "specs", "tla", "model-map.json");
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  return { root, entries, mapPath };
}

const canonical = async () => ({
  parseTlaModelMap,
  diffModelMap,
  canonicalIdentity,
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("model-completeness sensor component integration", () => {
  test("同期状態をpassし、入力byteを変更しない", async () => {
    const f = fixture();
    const beforeMap = readFileSync(f.mapPath);
    const beforeImpl = readFileSync(join(f.root, f.entries[0].implPath));
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      dependencies: { loadCanonical: canonical },
    });
    expect(result).toEqual({ pass: true, findings_count: 0, findings: [] });
    expect(readFileSync(f.mapPath)).toEqual(beforeMap);
    expect(readFileSync(join(f.root, f.entries[0].implPath))).toEqual(beforeImpl);
  });

  test("実装driftをhashやabsolute pathなしで報告する", async () => {
    const f = fixture();
    writeFileSync(join(f.root, f.entries[0].implPath), "changed secret-content\n");
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      dependencies: { loadCanonical: canonical },
    });
    expect(result).toMatchObject({
      pass: false,
      reason: "drift",
      findings_count: 1,
      findings: [{ path: f.entries[0].implPath, reason: "changed" }],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(f.root);
    expect(serialized).not.toContain("secret-content");
    expect(serialized).not.toContain(f.entries[0].sha256);
  });

  test("model identity driftも検出する", async () => {
    const f = fixture();
    writeFileSync(join(f.root, "specs", "tla", "FormalElection.tla"), "changed\n");
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      dependencies: { loadCanonical: canonical },
    });
    expect(result).toMatchObject({
      pass: false,
      findings: [
        { path: "specs/tla/FormalElection.tla", reason: "changed" },
      ],
    });
  });

  test("model asset読取不能をredacted findingへ閉じる", async () => {
    const f = fixture();
    rmSync(join(f.root, "specs", "tla", "FormalElection.tla"));
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      dependencies: { loadCanonical: canonical },
    });
    expect(result).toMatchObject({
      pass: false,
      findings: [
        { path: "specs/tla/FormalElection.tla", reason: "missing" },
      ],
    });
  });

  test("map不在とmalformedをfail closedにする", async () => {
    const missing = fixture();
    rmSync(missing.mapPath);
    expect(
      await checkModelCompleteness({
        projectRoot: missing.root,
        dependencies: { loadCanonical: canonical },
      }),
    ).toMatchObject({ pass: false, reason: "map-missing" });

    const malformed = fixture();
    writeFileSync(malformed.mapPath, "{\"schemaVersion\":2}");
    expect(
      await checkModelCompleteness({
        projectRoot: malformed.root,
        dependencies: { loadCanonical: canonical },
      }),
    ).toMatchObject({ pass: false, reason: "map-malformed" });
  });

  test("複数driftをcanonical entry順で全件返す", async () => {
    const f = fixture(3);
    for (const entry of f.entries) writeFileSync(join(f.root, entry.implPath), "drift\n");
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      dependencies: { loadCanonical: canonical },
    });
    expect(result.pass).toBe(false);
    expect(result.findings.map((finding) => finding.path)).toEqual(
      f.entries.map((entry) => entry.implPath),
    );
  });

  test("内部deadlineを有効なtimeout verdictへ写像する", async () => {
    const f = fixture();
    let tick = 0;
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      deadlineMs: 1,
      dependencies: {
        loadCanonical: canonical,
        now: () => tick++,
      },
    });
    expect(result).toMatchObject({
      pass: false,
      reason: "timeout",
      findings: [{ reason: "timeout" }],
    });
  });

  test("走査完了直後のdeadlineもtimeout verdictへ写像する", async () => {
    const f = fixture();
    const ticks = [0, 0, 2];
    const result = await checkModelCompleteness({
      projectRoot: f.root,
      deadlineMs: 1,
      dependencies: {
        loadCanonical: canonical,
        now: () => ticks.shift() ?? 2,
      },
    });
    expect(result).toMatchObject({
      pass: false,
      reason: "timeout",
      findings: [{ path: "specs/tla/model-map.json", reason: "timeout" }],
    });
  });

  test("SafeFileReaderのoutside-root・missing・not-regular・total上限を分類する", () => {
    const f = fixture();
    const rootReal = realpathSync(f.root);
    expect(
      modelCompletenessTestSeams.safeReadFile(
        rootReal,
        "../escape.ts",
        0,
      ).finding?.reason,
    ).toBe("outside-root");
    expect(
      modelCompletenessTestSeams.safeReadFile(
        rootReal,
        "packages/framework/core/tools/amadeus-election-missing.ts",
        0,
      ).finding?.reason,
    ).toBe("missing");
    const directoryPath =
      "packages/framework/core/tools/amadeus-election-directory.ts";
    mkdirSync(join(f.root, directoryPath));
    expect(
      modelCompletenessTestSeams.safeReadFile(
        rootReal,
        directoryPath,
        0,
      ).finding?.reason,
    ).toBe("not-regular");
    expect(
      modelCompletenessTestSeams.safeReadFile(
        rootReal,
        f.entries[0].implPath,
        64 * 1024 * 1024,
      ).finding?.reason,
    ).toBe("total-too-large");
  });

  test("read error分類はENOENT・ELOOP・unknownを固定する", () => {
    const error = (code: string): Error => Object.assign(new Error(code), { code });
    expect(modelCompletenessTestSeams.reasonForReadError(error("ENOENT"))).toBe(
      "missing",
    );
    expect(modelCompletenessTestSeams.reasonForReadError(error("ELOOP"))).toBe(
      "symlink",
    );
    expect(modelCompletenessTestSeams.reasonForReadError("not-an-error")).toBe(
      "unreadable",
    );
  });

  test("publish失敗時はUPDATE_FAILEDで旧mapを保持する", async () => {
    const f = fixture();
    const before = readFileSync(f.mapPath);
    writeFileSync(
      join(f.root, "specs", "tla", "FormalElection.tla"),
      "---- MODULE FormalElection ----\nVARIABLE x\n====\n",
    );
    const result = await updateModelMap({
      projectRoot: f.root,
      dependencies: {
        loadCanonical: canonical,
        publish: () => {
          throw new Error("publish failed");
        },
      },
    });
    expect(result).toMatchObject({ ok: false, code: "UPDATE_FAILED" });
    expect(result).toEqual({
      ok: false,
      code: "UPDATE_FAILED",
      detail: "specs/tla/model-map.json: publish-failed",
    });
    expect(readFileSync(f.mapPath)).toEqual(before);
  });

  test("map/model/cfgのTOCTOUを共通SafeFileReader reasonへ閉じる", async () => {
    for (const targetPath of [
      "specs/tla/model-map.json",
      "specs/tla/FormalElection.tla",
      "specs/tla/FormalElection.cfg",
    ]) {
      const f = fixture();
      const rootReal = realpathSync(f.root);
      const result = await checkModelCompleteness({
        projectRoot: f.root,
        dependencies: {
          loadCanonical: canonical,
          readFile: (actualRoot, path, totalBefore) =>
            path === targetPath
              ? {
                  finding: { path, reason: "identity-changed" },
                  bytes: 0,
                }
              : modelCompletenessTestSeams.safeReadFile(
                  actualRoot,
                  path,
                  totalBefore,
                ),
        },
      });
      expect(rootReal).toBe(realpathSync(f.root));
      expect(result).toMatchObject({
        pass: false,
        findings: [{ path: targetPath, reason: "identity-changed" }],
      });
      const updateResult = await updateModelMap({
        projectRoot: f.root,
        dependencies: {
          loadCanonical: canonical,
          readFile: (actualRoot, path, totalBefore) =>
            path === targetPath
              ? {
                  finding: { path, reason: "identity-changed" },
                  bytes: 0,
                }
              : modelCompletenessTestSeams.safeReadFile(
                  actualRoot,
                  path,
                  totalBefore,
                ),
        },
      });
      expect(updateResult).toMatchObject({
        ok: false,
        detail: `${targetPath}: identity-changed`,
      });
    }
  });

  test("update失敗detailは例外message・absolute path・hash・内容を漏らさない", async () => {
    const f = fixture();
    writeFileSync(
      join(f.root, "specs", "tla", "FormalElection.tla"),
      "changed secret-model-content\n",
    );
    const secretHash = "f".repeat(64);
    const result = await updateModelMap({
      projectRoot: f.root,
      dependencies: {
        loadCanonical: canonical,
        publish: () => {
          throw new Error(`${f.root}/outside ${secretHash} secret-model-content`);
        },
      },
    });
    const serialized = JSON.stringify(result);
    expect(result).toEqual({
      ok: false,
      code: "UPDATE_FAILED",
      detail: "specs/tla/model-map.json: publish-failed",
    });
    expect(serialized).not.toContain(f.root);
    expect(serialized).not.toContain(secretHash);
    expect(serialized).not.toContain("secret-model-content");
  });

  test("lock競合時はmapを一byteも読まない", async () => {
    const f = fixture();
    mkdirSync(`${f.mapPath}.lock`);
    let reads = 0;
    const result = await updateModelMap({
      projectRoot: f.root,
      dependencies: {
        loadCanonical: canonical,
        readFile: (rootReal, path, totalBefore) => {
          reads++;
          return modelCompletenessTestSeams.safeReadFile(
            rootReal,
            path,
            totalBefore,
          );
        },
      },
    });
    expect(result).toMatchObject({ ok: false, code: "LOCKED" });
    expect(reads).toBe(0);
  });

  test("test-only map注入もroot外pathを拒否する", async () => {
    const f = fixture();
    const outside = join(f.root, "..", "u5-outside-map.json");
    writeFileSync(outside, "outside-preserved");
    const before = readFileSync(outside);
    const result = await modelCompletenessTestSeams.updateWithMapPath({
      projectRoot: f.root,
      mapRelativePath: "../u5-outside-map.json",
    });
    expect(result).toEqual({
      ok: false,
      code: "UPDATE_FAILED",
      detail: "specs/tla/model-map.json: invalid-path",
    });
    expect(readFileSync(outside)).toEqual(before);
    rmSync(outside);
  });

  test("updateはmissing/malformed mapと実装読取失敗を分類する", async () => {
    const missing = fixture();
    rmSync(missing.mapPath);
    expect(
      await updateModelMap({
        projectRoot: missing.root,
        dependencies: { loadCanonical: canonical },
      }),
    ).toMatchObject({ ok: false, code: "MAP_MISSING" });

    const malformed = fixture();
    writeFileSync(malformed.mapPath, "{}");
    expect(
      await updateModelMap({
        projectRoot: malformed.root,
        dependencies: { loadCanonical: canonical },
      }),
    ).toMatchObject({ ok: false, code: "MAP_MALFORMED" });

    const unreadable = fixture();
    writeFileSync(
      join(unreadable.root, "specs", "tla", "FormalElection.tla"),
      "changed model\n",
    );
    rmSync(join(unreadable.root, unreadable.entries[0].implPath));
    expect(
      await updateModelMap({
        projectRoot: unreadable.root,
        dependencies: { loadCanonical: canonical },
      }),
    ).toMatchObject({ ok: false, code: "UPDATE_FAILED" });
  });

  test("mainをin-processでcheck/update両経路実行する", async () => {
    const f = fixture();
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      await main(["--project-dir", f.root]);
      await main(["updateModelMap", "--project-dir", f.root]);
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(JSON.parse(chunks[0])).toMatchObject({ pass: true });
    expect(JSON.parse(chunks[1])).toMatchObject({
      ok: false,
      code: "MODEL_UNCHANGED",
    });
  });

  test("production CLIは--mapを拒否しoperationを呼ばない", async () => {
    const f = fixture();
    const victim = join(f.root, "victim.json");
    writeFileSync(victim, "preserved");
    let called = false;
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(
        await main(
          [
            "updateModelMap",
            "--project-dir",
            f.root,
            "--map",
            victim,
          ],
          {
            check: async () => {
              called = true;
              return { pass: true, findings_count: 0, findings: [] };
            },
            update: async () => {
              called = true;
              return {
                ok: true,
                entries: 0,
                map: "specs/tla/model-map.json",
              };
            },
          },
        ),
      ).toBe(2);
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(called).toBe(false);
    expect(JSON.parse(chunks[0])).toEqual({
      ok: false,
      code: "INVALID_ARGUMENT",
      detail: "arguments: unsupported",
    });
    expect(readFileSync(victim, "utf-8")).toBe("preserved");
  });

  test("mainは予期しないchecker例外も有効なfail verdictへ閉じる", async () => {
    const f = fixture();
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(
        await main(["--project-dir", f.root], {
          check: async () => {
            throw new Error("unexpected");
          },
          update: updateModelMap,
        }),
      ).toBe(0);
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(JSON.parse(chunks[0])).toMatchObject({
      pass: false,
      reason: "map-malformed",
    });
  });

  test("canonical parserの不正path・順序・hash拒否をそのまま共有する", () => {
    const f = fixture();
    const original = JSON.parse(readFileSync(f.mapPath, "utf-8"));
    for (const entries of [
      [{ implPath: "../escape.ts", sha256: "a".repeat(64) }],
      [
        { implPath: "packages/framework/core/tools/amadeus-election-z.ts", sha256: "a".repeat(64) },
        { implPath: "packages/framework/core/tools/amadeus-election-a.ts", sha256: "b".repeat(64) },
      ],
      [{ implPath: "packages/framework/core/tools/amadeus-election.ts", sha256: "bad" }],
    ]) {
      const parsed = parseTlaModelMap(encoder.encode(JSON.stringify({ ...original, entries })));
      expect(parsed.ok).toBe(false);
    }
  });
});
