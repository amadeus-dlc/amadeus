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
const WORKFLOW_PATH = join(REPO_ROOT, ".github", "workflows", "bug-labels.yml");
const TEAM_NORM_PATH = join(REPO_ROOT, "amadeus", "spaces", "default", "memory", "team.md");

const canonicalElements = [
  ["duplicate-check", "checkboxes", "重複検索"],
  ["symptom", "textarea", "症状"],
  ["environment", "textarea", "観測環境・対象リビジョン"],
  ["reproduction", "textarea", "再現手順"],
  ["evidence", "textarea", "実測証拠"],
  ["expected", "textarea", "期待する挙動"],
  ["mechanism", "textarea", "機序"],
  ["impact", "textarea", "影響"],
  ["priority", "dropdown", "初期分類(P/S)"],
  ["severity", "dropdown", "初期分類(P/S)"],
  ["cause-location", "dropdown", "原因の所在・導入経緯"],
  ["provenance", "textarea", "原因の所在・導入経緯"],
] as const;

function loadForm(): IssueForm {
  return Bun.YAML.parse(readFileSync(FORM_PATH, "utf8")) as IssueForm;
}

function elementsById(form: IssueForm): Map<string, FormElement & { id: string }> {
  return new Map(
    form.body
      .filter((element): element is FormElement & { id: string } => Boolean(element.id))
      .map((element) => [element.id, element] as const),
  );
}

describe("t426 bug Issue Form contract", () => {
  test("the form captures the canonical bug evidence fields", () => {
    const form = loadForm();
    const byId = elementsById(form);

    expect(form.labels).toContain("bug");
    expect(form.title).toBe("bug: ");
    for (const [id, type] of canonicalElements) {
      expect(byId.get(id), `missing canonical field: ${id}`).toBeDefined();
      const element = byId.get(id);
      expect(element?.type, `wrong field type: ${id}`).toBe(type);
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
    const byId = elementsById(form);

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
    expect(norm).toContain("`.github/workflows/bug-labels.yml`");
    expect(norm).toContain("`cid:requirements-analysis:pre-filing-dup-and-branch-check`");
    expect(norm).toContain("`cid:requirements-analysis:bug-intent-linkage`");
    for (const term of new Set(canonicalElements.map(([, , normTerm]) => normTerm))) {
      expect(norm, `missing canonical norm term: ${term}`).toContain(term);
    }
    expect(norm).not.toContain("症状/機序/影響の既存様式");
  });

  test("the issue workflow atomically reconciles form classifications with labels", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      on: { issues: { types: string[] } };
      permissions: { issues: string };
      jobs: { sync: { if: string; steps: Array<{ with?: { script?: string } }> } };
    };
    const script = workflow.jobs.sync.steps[0]?.with?.script;

    expect(workflow.on.issues.types).toEqual(["opened", "edited"]);
    expect(workflow.permissions.issues).toBe("write");
    expect(workflow.jobs.sync.if).toContain("'bug'");
    expect(script).toBeDefined();

    const added: string[][] = [];
    const removed: string[] = [];
    const context = {
      payload: {
        issue: {
          number: 42,
          labels: [{ name: "bug" }, { name: "P1" }, { name: "S4-MINOR" }, { name: "external" }],
          body: [
            "### 優先度（いつ直すか）",
            "",
            "P2 — 通常",
            "",
            "### 重大度（どれだけ深刻か）",
            "",
            "S3-MAJOR — 回避策あり",
            "",
            "### 原因の所在",
            "",
            "origin:bootstrap",
          ].join("\n"),
        },
      },
      repo: { owner: "amadeus-dlc", repo: "amadeus" },
    };
    const github = {
      rest: {
        issues: {
          addLabels: async ({ labels }: { labels: string[] }) => added.push(labels),
          removeLabel: async ({ name }: { name: string }) => removed.push(name),
        },
      },
    };
    const core = { setFailed: (message: string) => expect.unreachable(message) };
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
      ...args: string[]
    ) => (context: unknown, github: unknown, core: unknown) => Promise<void>;

    await new AsyncFunction("context", "github", "core", script ?? "")(context, github, core);

    expect(added).toEqual([["P2", "S3-MAJOR", "origin:bootstrap"]]);
    expect(removed.sort()).toEqual(["P1", "S4-MINOR"]);
  });
});
