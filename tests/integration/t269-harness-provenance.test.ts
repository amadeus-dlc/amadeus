// t269-harness-provenance: resolver provenance, detector priority, and legacy cache.
// covers: function:detectHarnessType, function:harnessDir, constant:HARNESS_DIR_TO_TYPE

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HARNESS_DIR_TO_TYPE,
  type HarnessType,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CORE_TOOLS = join(REPO_ROOT, "packages", "framework", "core", "tools");
const LIB_SIBLINGS = [
  "amadeus-lib.ts",
  "amadeus-graph.ts",
  "amadeus-stage-schema.ts",
  "amadeus-version.ts",
] as const;

function copyLib(targetDir: string): string {
  mkdirSync(targetDir, { recursive: true });
  for (const sibling of LIB_SIBLINGS) {
    cpSync(join(CORE_TOOLS, sibling), join(targetDir, sibling));
  }
  return join(targetDir, "amadeus-lib.ts");
}

function evalLib(
  libPath: string,
  expression: string,
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  } = {},
): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `import { detectHarnessType, harnessDir } from ${JSON.stringify(libPath)}; console.log(${expression});`,
    ],
    {
      cwd: options.cwd ?? REPO_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        AMADEUS_HARNESS_TYPE: undefined,
        CLAUDECODE: undefined,
        AMADEUS_HARNESS_DIR: undefined,
        ...options.env,
      } as NodeJS.ProcessEnv,
    },
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
  return (result.stdout ?? "").trim();
}

describe("t269 harness provenance detector", () => {
  test("all seven explicit values are preserved exactly", () => {
    const values: HarnessType[] = [
      "claude-code",
      "codex",
      "cursor",
      "opencode",
      "kiro",
      "unknown",
      "manual",
    ];
    const lib = join(CORE_TOOLS, "amadeus-lib.ts");
    for (const value of values) {
      expect(
        evalLib(lib, "detectHarnessType()", {
          env: { AMADEUS_HARNESS_TYPE: value, CLAUDECODE: "1" },
        }),
      ).toBe(value);
    }
  });

  test("empty and invalid explicit values fail closed without falling through", () => {
    const lib = join(CORE_TOOLS, "amadeus-lib.ts");
    for (const value of ["", "Codex", "invalid-raw-value"]) {
      expect(
        evalLib(lib, "detectHarnessType()", {
          env: {
            AMADEUS_HARNESS_TYPE: value,
            CLAUDECODE: "1",
            AMADEUS_HARNESS_DIR: ".codex",
          },
        }),
      ).toBe("unknown");
    }
  });

  test("CLAUDECODE must equal the exact primary signal", () => {
    const lib = join(CORE_TOOLS, "amadeus-lib.ts");
    expect(evalLib(lib, "detectHarnessType()", { env: { CLAUDECODE: "1" } })).toBe(
      "claude-code",
    );
    expect(
      evalLib(lib, "detectHarnessType()", {
        env: { CLAUDECODE: "true", AMADEUS_HARNESS_DIR: ".codex" },
      }),
    ).toBe("codex");
  });

  test("script paths map five canonical dirs and reject an open-set dir", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t269-script-")));
    try {
      for (const [dir, type] of Object.entries(HARNESS_DIR_TO_TYPE)) {
        const lib = copyLib(join(tmp, type, dir, "tools"));
        expect(evalLib(lib, "detectHarnessType()", { cwd: tmp })).toBe(type);
      }
      const unknownLib = copyLib(join(tmp, "gemini", ".gemini", "tools"));
      expect(evalLib(unknownLib, "detectHarnessType()", { cwd: tmp })).toBe(
        "unknown",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("loose copy distinguishes CWD probe from fallback and keeps probe order", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t269-cwd-")));
    const emptyCwd = realpathSync(mkdtempSync(join(tmpdir(), "t269-empty-")));
    try {
      const lib = copyLib(join(tmp, "loose"));
      mkdirSync(join(tmp, ".cursor"));
      expect(evalLib(lib, "detectHarnessType()", { cwd: tmp })).toBe("cursor");
      mkdirSync(join(tmp, ".kiro"));
      expect(evalLib(lib, "detectHarnessType()", { cwd: tmp })).toBe("kiro");
      mkdirSync(join(tmp, ".claude"));
      expect(evalLib(lib, "detectHarnessType()", { cwd: tmp })).toBe(
        "claude-code",
      );
      expect(evalLib(lib, "detectHarnessType()", { cwd: emptyCwd })).toBe(
        "unknown",
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      rmSync(emptyCwd, { recursive: true, force: true });
    }
  });

  test("harnessDir keeps call-time env priority and the non-env cache", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "t269-cache-")));
    try {
      const lib = copyLib(join(tmp, "loose"));
      mkdirSync(join(tmp, ".codex"));
      const expression = `(() => {
        const first = harnessDir();
        process.env.AMADEUS_HARNESS_DIR = ".kiro";
        const override = harnessDir();
        delete process.env.AMADEUS_HARNESS_DIR;
        return JSON.stringify([first, override, harnessDir()]);
      })()`;
      expect(JSON.parse(evalLib(lib, expression, { cwd: tmp }))).toEqual([
        ".codex",
        ".kiro",
        ".codex",
      ]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
