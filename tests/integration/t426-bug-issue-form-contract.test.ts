import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

type FormElement = {
  type: string;
  id?: string;
  attributes?: {
    label?: string;
    options?: Array<string | { label: string; required?: boolean }>;
    value?: string;
  };
  validations?: { required?: boolean };
};

type IssueForm = {
  name: string;
  description: string;
  title?: string;
  labels?: string[];
  body: FormElement[];
};

const FORM_PATH = join(REPO_ROOT, ".github", "ISSUE_TEMPLATE", "bug.yml");
const TEAM_NORM_PATH = join(REPO_ROOT, "amadeus", "spaces", "default", "memory", "team.md");

function loadForm(): IssueForm {
  return Bun.YAML.parse(readFileSync(FORM_PATH, "utf8")) as IssueForm;
}

describe("t426 bug Issue Form contract", () => {
  test("the form captures the canonical bug evidence fields", () => {
    const form = loadForm();
    const byId = new Map(form.body.filter((element) => element.id).map((element) => [element.id, element]));
    const requiredIds = [
      "duplicate-check",
      "symptom",
      "environment",
      "reproduction",
      "evidence",
      "expected",
      "mechanism",
      "impact",
      "priority",
      "severity",
      "cause-location",
      "provenance",
    ];

    expect(form.labels).toContain("bug");
    expect(form.title).toBe("bug: ");
    for (const id of requiredIds) {
      expect(byId.get(id), `missing canonical field: ${id}`).toBeDefined();
      const element = byId.get(id);
      if (element?.type === "checkboxes") {
        const options = element.attributes?.options ?? [];
        expect(options.length).toBeGreaterThan(0);
        expect(
          options.every((option) => typeof option === "object" && option.required === true),
          `every checkbox must be required: ${id}`,
        ).toBe(true);
      } else {
        expect(element?.validations?.required, `field must be required: ${id}`).toBe(true);
      }
    }

    const labels = form.body.flatMap((element) => element.attributes?.label ?? []);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("priority and severity choices match the repository label taxonomy", () => {
    const form = loadForm();
    const byId = new Map(form.body.filter((element) => element.id).map((element) => [element.id, element]));

    expect(byId.get("priority")?.attributes?.options).toEqual([
      "P0 — 正しさ・安全性の破綻",
      "P1 — 重要だが回避可能",
      "P2 — 通常",
      "P3 — いつか対応",
    ]);
    expect(byId.get("severity")?.attributes?.options).toEqual([
      "S1-FATAL — データ・監査・ゲート整合性の破壊、誤マージ誘発、ワークフロー停止",
      "S2-CRITICAL — 主要機能の誤動作、または回避策のない偽 green・偽赤",
      "S3-MAJOR — 回避策のある誤動作、または限定条件での発現",
      "S4-MINOR — 軽微、エッジケース、表示層",
    ]);
  });

  test("the team norm defines the form as the repository projection of the canonical schema", () => {
    const norm = readFileSync(TEAM_NORM_PATH, "utf8");

    expect(norm).toContain("cid:requirements-analysis:bug-issue-canonical-body");
    expect(norm).toContain("`.github/ISSUE_TEMPLATE/bug.yml`");
    expect(norm).not.toContain("症状/機序/影響の既存様式");
  });
});
