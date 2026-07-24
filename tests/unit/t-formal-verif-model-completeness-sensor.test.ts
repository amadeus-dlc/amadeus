import { describe, expect, test } from "bun:test";
import { modelCompletenessTestSeams } from "../../packages/framework/core/tools/amadeus-sensor-model-completeness.ts";

describe("model-completeness sensor pure unit", () => {
  test("read error codeを固定reasonへ写像する", () => {
    expect(modelCompletenessTestSeams.reasonForReadError(Object.assign(new Error(), { code: "ENOENT" }))).toBe(
      "missing",
    );
    expect(modelCompletenessTestSeams.reasonForReadError(Object.assign(new Error(), { code: "ELOOP" }))).toBe(
      "symlink",
    );
    expect(modelCompletenessTestSeams.reasonForReadError(new Error("denied"))).toBe("unreadable");
  });

  test("open前後のidentity変化を固定reasonへ写像する", () => {
    expect(() =>
      modelCompletenessTestSeams.assertStableIdentity(
        { dev: 1, ino: 2 },
        { dev: 1, ino: 3 },
      ),
    ).toThrow("identity-changed");
    expect(() =>
      modelCompletenessTestSeams.assertStableIdentity(
        { dev: 1, ino: 2 },
        { dev: 1, ino: 2 },
      ),
    ).not.toThrow();
  });

  test("root containmentはprefix衝突と上位移動を拒否する", () => {
    expect(modelCompletenessTestSeams.rootContains("/repo", "/repo/specs/model.tla")).toBe(true);
    expect(modelCompletenessTestSeams.rootContains("/repo", "/repo-other/model.tla")).toBe(false);
    expect(modelCompletenessTestSeams.rootContains("/repo", "/outside/model.tla")).toBe(false);
  });

  test("map不在を有効なfail verdictへ閉じる", () => {
    expect(modelCompletenessTestSeams.mapFailure("map-missing")).toEqual({
      pass: false,
      reason: "map-missing",
      findings_count: 1,
      findings: [{ path: "specs/tla/model-map.json", reason: "missing" }],
    });
  });

  test("map破損を有効なfail verdictへ閉じる", () => {
    expect(modelCompletenessTestSeams.mapFailure("map-malformed")).toEqual({
      pass: false,
      reason: "map-malformed",
      findings_count: 1,
      findings: [{ path: "specs/tla/model-map.json", reason: "unreadable" }],
    });
  });
});
