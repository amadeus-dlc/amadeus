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

const FORM_DIR = join(REPO_ROOT, ".github", "ISSUE_TEMPLATE");
const WORKFLOW_PATH = join(REPO_ROOT, ".github", "workflows", "issue-labels.yml");
const TEAM_NORM_PATH = join(REPO_ROOT, "amadeus", "spaces", "default", "memory", "team.md");

const formTypes = ["bug", "enhancement", "documentation", "question"] as const;
type FormType = (typeof formTypes)[number];

const commonElements = [
  ["duplicate-check", "checkboxes"],
  ["context", "textarea"],
  ["evidence", "textarea"],
  ["desired-outcome", "textarea"],
  ["impact", "textarea"],
  ["related-work", "textarea"],
  ["priority", "dropdown"],
] as const;

const typeSpecificElements: Record<FormType, ReadonlyArray<readonly [string, string]>> = {
  bug: [
    ["environment", "textarea"],
    ["harness", "dropdown"],
    ["harness-version", "input"],
    ["amadeus-version", "input"],
    ["reproduction", "textarea"],
    ["mechanism", "textarea"],
    ["severity", "dropdown"],
    ["cause-location", "dropdown"],
    ["provenance", "textarea"],
  ],
  enhancement: [
    ["elevator-pitch", "textarea"],
    ["alternatives", "textarea"],
  ],
  documentation: [["audience-and-surface", "textarea"]],
  question: [["decision-options", "textarea"]],
};

const priorityOptions = [
  "未選択",
  "P0 — 正しさ・安全性の破綻",
  "P1 — 重要だが回避可能",
  "P2 — 通常",
  "P3 — いつか対応",
];

function loadForm(type: FormType): IssueForm {
  return Bun.YAML.parse(readFileSync(join(FORM_DIR, `${type}.yml`), "utf8")) as IssueForm;
}

function elementsById(form: IssueForm): Map<string, FormElement & { id: string }> {
  return new Map(
    form.body
      .filter((element): element is FormElement & { id: string } => typeof element.id === "string")
      .map((element) => [element.id, element] as const),
  );
}

function requireElement(
  byId: Map<string, FormElement & { id: string }>,
  id: string,
  type: string,
): void {
  const element = byId.get(id);
  expect(element, `missing field: ${id}`).toBeDefined();
  expect(element?.type, `wrong field type: ${id}`).toBe(type);
  if (element?.type === "checkboxes") {
    const options = element.attributes?.options ?? [];
    expect(options.length).toBeGreaterThan(0);
    expect(
      options.every((option) => typeof option === "object" && option.required === true),
      `every checkbox must be required: ${id}`,
    ).toBe(true);
    return;
  }
  expect(element?.validations?.required, `field must be required: ${id}`).toBe(true);
}

describe("t426 Issue Form contract", () => {
  test("manual Issue taxonomy is closed and blank Issues are disabled", () => {
    const config = Bun.YAML.parse(readFileSync(join(FORM_DIR, "config.yml"), "utf8")) as {
      blank_issues_enabled: boolean;
      contact_links: unknown[];
    };

    expect(config.blank_issues_enabled).toBe(false);
    expect(config.contact_links).toEqual([]);
    for (const type of formTypes) {
      const form = loadForm(type);
      expect(form.labels).toEqual([type]);
      expect(form.body[0]?.attributes?.value).toContain(
        `<!-- amadeus-issue-form:v1 type=${type} -->`,
      );
    }
  });

  test("all four forms enforce the same common body and priority taxonomy", () => {
    for (const type of formTypes) {
      const form = loadForm(type);
      const byId = elementsById(form);
      for (const [id, elementType] of commonElements) requireElement(byId, id, elementType);
      expect(byId.get("priority")?.attributes?.options).toEqual(priorityOptions);

      const labels = form.body.flatMap((element) => element.attributes?.label ?? []);
      expect(new Set(labels).size, `duplicate field label in ${type}`).toBe(labels.length);
    }
  });

  test("each form adds only its type-specific required fields", () => {
    for (const type of formTypes) {
      const byId = elementsById(loadForm(type));
      for (const [id, elementType] of typeSpecificElements[type]) {
        requireElement(byId, id, elementType);
      }

      const forbidden = formTypes
        .filter((other) => other !== type)
        .flatMap((other) => typeSpecificElements[other])
        .map(([id]) => id);
      for (const id of forbidden) expect(byId.has(id), `${type} must not require ${id}`).toBe(false);
    }
  });

  test("bug classification requires active severity and cause selection", () => {
    const byId = elementsById(loadForm("bug"));
    expect(byId.get("severity")?.attributes?.options).toEqual([
      "未選択",
      "S1-FATAL — データ・監査・ゲート整合性の破壊、誤マージ誘発、ワークフロー停止",
      "S2-CRITICAL — 主要機能の誤動作、または回避策のない偽 green・偽赤",
      "S3-MAJOR — 回避策のある誤動作、または限定条件での発現",
      "S4-MINOR — 軽微、エッジケース、表示層",
    ]);
    expect(byId.get("cause-location")?.attributes?.options).toEqual([
      "未選択",
      "要件での見落とし",
      "設計判断の誤り",
      "設計は正しいが実装が逸脱",
      "origin:bootstrap",
      "外部要因",
      "未特定",
    ]);
  });

  test("bug reports identify the supported harness distribution", () => {
    const byId = elementsById(loadForm("bug"));
    expect(byId.get("harness")?.attributes?.options).toEqual([
      "claude",
      "codex",
      "cursor",
      "kimi",
      "kiro",
      "kiro-ide",
      "opencode",
      "ハーネス非依存",
    ]);
  });

  test("the team norm separates common, type-specific, mirror, and post-filing rules", () => {
    const norm = readFileSync(TEAM_NORM_PATH, "utf8");

    // Re-baselined by #2921 after the norm distillation in #2919. Two cids were
    // consolidated away and their content is pinned as surviving substrings instead:
    //   issue-type-specific-body   -> the delegation clause inside issue-canonical-body
    //                                 (type-specific forms live in the ISSUE_TEMPLATE yml files,
    //                                  whose fields this file already pins directly)
    //   intent-first-mirror-issue  -> the (B) intent-first branch inside issue-taxonomy
    for (const cid of [
      "issue-taxonomy",
      "issue-type-decision",
      "issue-canonical-body",
      "pre-filing-dup-and-branch-check",
      "issue-cross-review",
    ]) {
      expect(norm, `missing canonical norm: ${cid}`).toContain(`cid:requirements-analysis:${cid}`);
    }
    expect(norm).toContain("`bug` / `enhancement` / `documentation` / `question`");
    expect(norm).toContain("**完了条件**を上から順に判定");
    expect(norm).toContain("種別固有の様式は `.github/ISSUE_TEMPLATE/*.yml` を正本とし、同じ変更で同期する");
    expect(norm).toContain("intent record を正本に engine がミラー Issue を生成し、record → Issue の一方向同期");
    expect(norm).not.toContain("cid:requirements-analysis:bug-issue-canonical-body");
    expect(norm).not.toContain("`.github/workflows/bug-labels.yml`");
  });

  test("the workflow reconciles common and bug-specific labels", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      on: { issues: { types: string[] } };
      permissions: Record<string, never>;
      jobs: {
        sync: {
          if: string;
          permissions: { contents: string; issues: string };
          steps: Array<{ uses?: string; with?: { script?: string } }>;
        };
      };
    };
    const job = workflow.jobs.sync;
    const script = job.steps[0]?.with?.script;

    expect(workflow.on.issues.types).toEqual(["opened", "edited"]);
    expect(workflow.permissions).toEqual({});
    expect(job.permissions).toEqual({ contents: "read", issues: "write" });
    // The gate must key on the heading stem only, without pinning the heading
    // level's hash count. Pinning either paren width or a fixed heading level
    // (`### `) here would re-introduce #2408 / #2916: the job silently
    // skipped — and with it the whole fail-closed classification check — for
    // every half-width or non-H3 body.
    expect(job.if).toContain("# 優先度");
    expect(job.if).not.toContain("### 優先度");
    expect(job.if).not.toContain("（いつ対応するか）");
    expect(job.if).not.toContain("（いつ直すか）");
    expect(job.steps[0]?.uses).toBe(
      "actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3",
    );
    expect(script).toBeDefined();

    const bug = await executeWorkflow(
      script ?? "",
      issueBody("bug", "P2 — 通常", [
        ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
        ["原因の所在", "origin:bootstrap"],
      ]),
      ["bug", "P1", "S4-MINOR", "external"],
    );
    expect(bug.failures).toEqual([]);
    expect(bug.added).toEqual([["P2", "S3-MAJOR", "origin:bootstrap"]]);
    expect(bug.removed.sort()).toEqual(["P1", "S4-MINOR"]);

    const enhancement = await executeWorkflow(
      script ?? "",
      issueBody("enhancement", "P3 — いつか対応", [["エレベーターピッチ", "価値仮説"]]),
      ["bug", "P2", "S3-MAJOR", "origin:bootstrap"],
    );
    expect(enhancement.failures).toEqual([]);
    expect(enhancement.added).toEqual([["enhancement", "P3"]]);
    expect(enhancement.removed.sort()).toEqual(["P2", "S3-MAJOR", "bug", "origin:bootstrap"]);

    const documentation = await executeWorkflow(
      script ?? "",
      issueBody("documentation", "P2 — 通常", [["対象読者・ドキュメント面", "利用者向けガイド"]]),
      ["enhancement", "P1"],
    );
    expect(documentation.failures).toEqual([]);
    expect(documentation.added).toEqual([["documentation", "P2"]]);
    expect(documentation.removed.sort()).toEqual(["P1", "enhancement"]);

    const question = await executeWorkflow(
      script ?? "",
      issueBody("question", "P1 — 重要だが回避可能", [["回答してほしい問い・選択肢", "A/B"]]),
      ["documentation", "P3"],
    );
    expect(question.failures).toEqual([]);
    expect(question.added).toEqual([["question", "P1"]]);
    expect(question.removed.sort()).toEqual(["P3", "documentation"]);

    const legacyBug = await executeWorkflow(
      script ?? "",
      issueBody("bug", "P1 — 重要だが回避可能", [
        ["重大度（どれだけ深刻か）", "S2-CRITICAL — 回避策なし"],
        ["原因の所在", "未特定"],
      ]).replace("優先度（いつ対応するか）", "優先度（いつ直すか）"),
      ["bug", "P2", "S3-MAJOR"],
    );
    expect(legacyBug.failures).toEqual([]);
    expect(legacyBug.added).toEqual([["P1", "S2-CRITICAL"]]);
    expect(legacyBug.removed.sort()).toEqual(["P2", "S3-MAJOR"]);
  });

  // #2561: a webhook payload can go stale against GitHub's live label state
  // within the ~10s the job takes to run (TOCTOU). A DELETE 404 means the
  // label is already gone — the intended end state — so removeLabel must be
  // idempotent on 404 and must not abort the remaining removals in the loop.
  // Any other status (403/429/5xx/...) stays fail-closed.
  test("removeLabel 404 is idempotent and does not abort later removals (#2561)", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      jobs: { sync: { steps: Array<{ with?: { script?: string } }> } };
    };
    const script = workflow.jobs.sync.steps[0]?.with?.script ?? "";
    const body = issueBody("bug", "P2 — 通常", [
      ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
      ["原因の所在", "origin:bootstrap"],
    ]);
    // Starting labels reconcile down to {bug, P2, S3-MAJOR, origin:bootstrap}:
    // "P1" and "S4-MINOR" must both be removed. "P1" 404s (stale payload);
    // "S4-MINOR" must still be removed afterward — the #2561 regression was
    // that the 404 on "P1" aborted the loop before "S4-MINOR" was reached.
    const removedByMock: string[] = [];
    const notFound = Object.assign(new Error("Label does not exist"), { status: 404 });
    const idempotent = await executeWorkflow(script, body, ["bug", "P1", "S4-MINOR"], {
      removeLabel: async ({ name }) => {
        if (name === "P1") throw notFound;
        removedByMock.push(name);
      },
    });
    expect(idempotent.failures).toEqual([]);
    // "P1" hit the 404 branch (not pushed onto removedByMock); "S4-MINOR"
    // being present proves the loop continued past the 404 instead of
    // aborting — the exact #2561 regression.
    expect(removedByMock).toContain("S4-MINOR");
    expect(idempotent.infos.some((line) => line.includes("P1"))).toBe(true);

    const forbidden = Object.assign(new Error("Resource not accessible"), { status: 403 });
    const failClosed = executeWorkflow(script, body, ["bug", "P1", "S4-MINOR"], {
      removeLabel: async ({ name }) => {
        if (name === "P1") throw forbidden;
      },
    });
    await expect(failClosed).rejects.toThrow("Resource not accessible");
  });

  // #2408: paren width is a rendering detail. Both the job gate and the script
  // must read a half-width body exactly like the full-width one the Form emits,
  // or CLI-filed Issues slip past the classification check in silence.
  test("classification is independent of heading paren width (#2408)", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      jobs: { sync: { if: string; steps: Array<{ with?: { script?: string } }> } };
    };
    const job = workflow.jobs.sync;
    const script = job.steps[0]?.with?.script ?? "";

    // The gate is a disjunction of contains(body, '<literal>') terms; evaluate
    // the real expression rather than restating which literals it should hold.
    const literals = [...job.if.matchAll(/contains\(github\.event\.issue\.body,\s*'([^']*)'\)/g)]
      .map((match) => match[1]);
    expect(literals.length).toBeGreaterThan(0);
    const gateFires = (body: string): boolean => literals.some((literal) => body.includes(literal));

    const halfWidthBug = issueBody(
      "bug",
      "P2 — 通常",
      [
        ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
        ["原因の所在", "未特定"],
      ],
      "half",
    );
    const fullWidthBug = issueBody("bug", "P2 — 通常", [
      ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
      ["原因の所在", "未特定"],
    ]);

    // The body really is half-width — otherwise this test would pass for the
    // wrong reason.
    expect(halfWidthBug).toContain("### 優先度(いつ対応するか)");
    expect(halfWidthBug).not.toContain("（");

    expect(gateFires(halfWidthBug), "the job gate fires for a half-width body").toBe(true);
    expect(gateFires(fullWidthBug), "the job gate still fires for a full-width body").toBe(true);
    // A body with no priority heading at all (an Intent Mirror Issue, say) is
    // still skipped: widening the gate must not turn it into a catch-all.
    expect(gateFires("# Intent Mirror\n\nstatus: running")).toBe(false);

    const half = await executeWorkflow(script, halfWidthBug, []);
    expect(half.failures).toEqual([]);
    expect(half.added).toEqual([["bug", "P2", "S3-MAJOR"]]);

    const full = await executeWorkflow(script, fullWidthBug, []);
    expect(full.added).toEqual(half.added);
    expect(full.failures).toEqual(half.failures);
  });

  // #2916: the Issue Form always renders H3 (`### `), but a body built by
  // hand or by `gh issue create --body-file` is not bound to that heading
  // level. Gating and matching on a literal `### ` skipped the job entirely
  // for an H2 (`## `) body, silencing the fail-closed classification check
  // (same failure shape as #2408, on the heading-level axis instead of
  // paren width).
  test("t545: classification is independent of heading level (#2916)", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      jobs: { sync: { if: string; steps: Array<{ with?: { script?: string } }> } };
    };
    const job = workflow.jobs.sync;
    const script = job.steps[0]?.with?.script ?? "";

    // Evaluate the real gate expression, same as the #2408 test above.
    const literals = [...job.if.matchAll(/contains\(github\.event\.issue\.body,\s*'([^']*)'\)/g)]
      .map((match) => match[1]);
    expect(literals.length).toBeGreaterThan(0);
    const gateFires = (body: string): boolean => literals.some((literal) => body.includes(literal));

    const h2Bug = issueBody(
      "bug",
      "P2 — 通常",
      [
        ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
        ["原因の所在", "未特定"],
      ],
      "full",
      2,
    );
    const h1Bug = issueBody(
      "bug",
      "P2 — 通常",
      [
        ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
        ["原因の所在", "未特定"],
      ],
      "full",
      1,
    );
    const h3Bug = issueBody("bug", "P2 — 通常", [
      ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
      ["原因の所在", "未特定"],
    ]);

    // The body really is H2 — otherwise this test would pass for the wrong
    // reason (this is #2913's exact shape: a CLI-filed body with H2 headings).
    expect(h2Bug).toContain("## 優先度（いつ対応するか）");
    expect(h2Bug).not.toContain("### 優先度");

    expect(gateFires(h1Bug), "the job gate fires for an H1 body").toBe(true);
    expect(gateFires(h2Bug), "the job gate fires for an H2 body").toBe(true);
    expect(gateFires(h3Bug), "the job gate still fires for the Form's H3 body").toBe(true);
    // A body with no priority heading at all (an Intent Mirror Issue, say) is
    // still skipped: widening the gate to any heading level must not turn it
    // into a catch-all.
    expect(gateFires("# Intent Mirror\n\nstatus: running")).toBe(false);

    const h1 = await executeWorkflow(script, h1Bug, []);
    expect(h1.failures).toEqual([]);
    expect(h1.added).toEqual([["bug", "P2", "S3-MAJOR"]]);

    const h2 = await executeWorkflow(script, h2Bug, []);
    expect(h2.failures).toEqual([]);
    expect(h2.added).toEqual([["bug", "P2", "S3-MAJOR"]]);

    const h3 = await executeWorkflow(script, h3Bug, []);
    expect(h3.added).toEqual(h2.added);
    expect(h3.failures).toEqual(h2.failures);
  });

  test("the workflow rejects untouched placeholder classifications", async () => {
    const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as {
      jobs: { sync: { steps: Array<{ with?: { script?: string } }> } };
    };
    const result = await executeWorkflow(
      workflow.jobs.sync.steps[0]?.with?.script ?? "",
      issueBody("bug", "未選択", [
        ["重大度（どれだけ深刻か）", "未選択"],
        ["原因の所在", "未選択"],
      ]),
      ["bug"],
    );

    expect(result.failures).toEqual(["Issue Form から種別/P分類を取得できませんでした"]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);

    const ambiguous = await executeWorkflow(
      workflow.jobs.sync.steps[0]?.with?.script ?? "",
      issueBody("bug", "P2 — 通常", [
        ["重大度（どれだけ深刻か）", "S3-MAJOR — 回避策あり"],
        ["原因の所在", "未特定"],
        ["エレベーターピッチ", "誤って混在した別種別フィールド"],
      ]),
      ["bug"],
    );
    expect(ambiguous.failures).toEqual(["Issue Form から種別/P分類を取得できませんでした"]);
    expect(ambiguous.added).toEqual([]);
    expect(ambiguous.removed).toEqual([]);
  });
});

function issueBody(
  type: FormType,
  priority: string,
  fields: ReadonlyArray<readonly [string, string]> = [],
  parens: "full" | "half" = "full",
  headingLevel = 3,
): string {
  // The Issue Form renders full-width （）; bodies assembled by hand or by
  // `gh issue create --body-file` routinely carry half-width (). Same heading,
  // different rendering — the classification must not depend on which.
  const widen = (heading: string): string =>
    parens === "full" ? heading : heading.replace(/（/g, "(").replace(/）/g, ")");
  // The Issue Form always renders H3 (`### `), but a hand-written or
  // `gh issue create --body-file` body isn't bound to that level (#2916).
  const hashes = "#".repeat(headingLevel);
  return [
    `<!-- amadeus-issue-form:v1 type=${type} -->`,
    "",
    widen(`${hashes} 優先度（いつ対応するか）`),
    "",
    priority,
    ...fields.flatMap(([label, value]) => ["", widen(`${hashes} ${label}`), "", value]),
  ].join("\n");
}

async function executeWorkflow(
  script: string,
  body: string,
  labels: string[],
  overrides: { removeLabel?: (args: { name: string }) => Promise<void> } = {},
) {
  const added: string[][] = [];
  const removed: string[] = [];
  const failures: string[] = [];
  const infos: string[] = [];
  const context = {
    payload: { issue: { number: 42, labels: labels.map((name) => ({ name })), body } },
    repo: { owner: "amadeus-dlc", repo: "amadeus" },
  };
  const defaultRemoveLabel = async ({ name }: { name: string }) => {
    removed.push(name);
  };
  const github = {
    rest: {
      issues: {
        addLabels: async ({ labels: next }: { labels: string[] }) => added.push(next),
        removeLabel: overrides.removeLabel ?? defaultRemoveLabel,
      },
    },
  };
  const core = {
    setFailed: (message: string) => failures.push(message),
    info: (message: string) => infos.push(message),
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (context: unknown, github: unknown, core: unknown) => Promise<void>;

  await new AsyncFunction("context", "github", "core", script)(context, github, core);
  return { added, removed, failures, infos };
}
