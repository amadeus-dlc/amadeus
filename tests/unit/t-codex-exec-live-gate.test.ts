import { describe, expect, test } from "bun:test";
import { codexExecLiveSkipReason } from "../harness/codex-exec-live.ts";

describe("codex exec live E2E gate", () => {
  test("GitHub Actions always skips even when live execution is opted in", () => {
    expect(
      codexExecLiveSkipReason({
        AMADEUS_CODEX_EXEC_LIVE: "1",
        GITHUB_ACTIONS: "true",
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
});
