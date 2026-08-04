import { describe, expect, test } from "bun:test";
import {
  codexExecChildEnvironment,
  codexExecLiveRequirementsSkipReason,
  codexExecLiveSkipReason,
} from "../harness/codex-exec-live.ts";

describe("codex exec live E2E gate", () => {
  test("GitHub Actions always skips even when live execution is opted in", () => {
    expect(
      codexExecLiveSkipReason({
        AMADEUS_CODEX_EXEC_LIVE: "1",
        GITHUB_ACTIONS: "true",
      }),
    ).toBe("live codex-exec E2E is disabled on GitHub Actions");
  });

  test("the full requirements check returns before probing local executables on GitHub Actions", () => {
    expect(
      codexExecLiveRequirementsSkipReason({
        env: {
          AMADEUS_CODEX_EXEC_LIVE: "1",
          GITHUB_ACTIONS: "true",
        },
        codexBin: "this-command-must-not-run",
        distributionDir: "/this/path/must/not/be/read",
      }),
    ).toBe("live codex-exec E2E is disabled on GitHub Actions");
  });

  test("local execution remains available through the explicit live opt-in", () => {
    expect(codexExecLiveSkipReason({ AMADEUS_CODEX_EXEC_LIVE: "1" })).toBeNull();
  });

  test("local execution skips without the explicit live opt-in", () => {
    expect(codexExecLiveSkipReason({})).toBe(
      "set AMADEUS_CODEX_EXEC_LIVE=1 to run live codex-exec E2E",
    );
  });

  test("the child environment exposes only the scratch auth home", () => {
    expect(
      codexExecChildEnvironment("/scratch/codex-home", {
        AMADEUS_CODEX_EXEC_AUTH_HOME: "/real/codex-home",
        HOME: "/real/home",
        PATH: "/bin",
        OPENAI_API_KEY: "sk-fixture",
        UNRELATED_SECRET: "must-not-leak",
      }),
    ).toEqual({
      CODEX_HOME: "/scratch/codex-home",
      HOME: "/scratch/codex-home",
      OPENAI_API_KEY: "sk-fixture",
      PATH: "/bin",
    });
  });
});
