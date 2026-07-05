// u002-kanban-sync-cli C-3: GitHub Projects v2 への薄い wrapper（gh api graphql 経由）。
// クエリ・mutation の組み立ては純関数に分離し、eval で境界検証する（ネットワークなし）。
import { spawnSync } from "node:child_process";
import type { Column } from "./column";
import type { IntentCard } from "./intent-card";
import type { ProjectRef } from "./project-ref";
import type { StatusOption } from "./status-option";
import type { FieldSpec } from "./field-spec";
import type { FieldMap } from "./field-map";

export type { ProjectRef } from "./project-ref";
export type { StatusOption } from "./status-option";
export type { FieldSpec } from "./field-spec";
export type { FieldMap } from "./field-map";

export const TEXT_FIELDS = [
  "Agent",
  "Host",
  "Worktree",
  "Scope",
  "Stage",
  "Issue",
  "Synced At",
] as const;

const GH_TIMEOUT_MS = 30_000;

function gh(args: string[]): string {
  const r = spawnSync("gh", args, { encoding: "utf-8", timeout: GH_TIMEOUT_MS });
  if (r.error) throw new Error(`gh の起動に失敗した: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr ?? "").split("\n").slice(0, 3).join(" ").trim();
    throw new Error(`gh が失敗した（exit ${r.status}）: ${err}`);
  }
  return r.stdout;
}

function graphql(query: string, fields: Record<string, string> = {}): unknown {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(fields)) args.push("-f", `${k}=${v}`);
  return JSON.parse(gh(args));
}

// FR-4.1: project scope が無ければ、対処コマンド付きの明示エラーで書き込み前に停止する。
export function assertProjectScope(): void {
  const r = spawnSync("gh", ["auth", "status"], { encoding: "utf-8", timeout: GH_TIMEOUT_MS });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const m = out.match(/Token scopes: (.+)/);
  if (!m || !m[1]!.includes("project")) {
    throw new Error(
      "gh の token に project scope が無い。`gh auth refresh -s project` を実行してから再試行する（FR-4.1）"
    );
  }
}

// FR-3.1: project は既存を解決するだけ。無ければ人間が作成する必要がある旨で停止する。
export function resolveProject(org: string, title: string): ProjectRef {
  const data = graphql(
    `query($org:String!){ organization(login:$org){ projectsV2(first:50){ nodes{ id number title } } } }`,
    { org }
  ) as { data?: { organization?: { projectsV2?: { nodes?: ProjectRef[] } } } };
  const nodes = data.data?.organization?.projectsV2?.nodes ?? [];
  const hit = nodes.find((n) => n.title === title);
  if (!hit) {
    throw new Error(
      `org「${org}」に project「${title}」が見つからない。人間が Projects v2 を作成して amadeus repo にリンクする必要がある（C11、D-AD8）`
    );
  }
  return hit;
}

// 単一選択（Status）の option 更新は「既存 option 全体 + 不足分」の完全セット再送で行う
// （component-methods.md の実装留意）。GraphQL の入力型
// ProjectV2SingleSelectFieldOptionInput は id を受け取れないため、既存 option は
// 「名前・色・説明を保持した再送」で維持する（既存 item の値は名前一致で保たれる）。
// 更新後は listFields で option を再取得し、以降の upsert は新しい option ID を使う。
export function buildEnsureStatusOptions(
  existing: StatusOption[],
  required: string[]
): StatusOption[] {
  const have = new Set(existing.map((o) => o.name));
  const merged: StatusOption[] = [...existing];
  for (const name of required) {
    if (!have.has(name)) merged.push({ name, color: "GRAY", description: "" });
  }
  return merged;
}

// 1 card 分のフィールド更新 mutation を alias で 1 リクエストに束ねる（D-AD4）。
export function buildItemFieldMutation(
  projectId: string,
  itemId: string,
  specs: FieldSpec[]
): string {
  const parts = specs.map((s, i) => {
    const value =
      s.kind === "text"
        ? `text: ${JSON.stringify(s.text)}`
        : `singleSelectOptionId: ${JSON.stringify(s.optionId)}`;
    return `m${i}: updateProjectV2ItemFieldValue(input:{projectId:${JSON.stringify(projectId)}, itemId:${JSON.stringify(itemId)}, fieldId:${JSON.stringify(s.fieldId)}, value:{${value}}}){ projectV2Item { id } }`;
  });
  return `mutation { ${parts.join(" ")} }`;
}

export function buildDraftIssueBody(card: IntentCard): string {
  const issueLinks =
    card.issues.length > 0
      ? card.issues.map((n) => `https://github.com/amadeus-dlc/amadeus/issues/${n}（#${n}）`).join("、")
      : "（Issue 紐付けなし）";
  return [
    `Issue: ${issueLinks}`,
    `scope: ${card.scope}`,
    `worktree: ${card.worktree}`,
    "",
    "このカードは kanban-sync による一方向鏡であり、手編集は次回 sync で上書きされる。",
  ].join("\n");
}

type FieldNode = {
  id: string;
  name: string;
  options?: Array<{ id: string; name: string; color?: string; description?: string }>;
};

function listFields(projectId: string): FieldNode[] {
  const data = graphql(
    `query($pid:ID!){ node(id:$pid){ ... on ProjectV2 { fields(first:50){ nodes{ ... on ProjectV2FieldCommon { id name } ... on ProjectV2SingleSelectField { id name options { id name color description } } } } } } }`,
    { pid: projectId }
  ) as { data?: { node?: { fields?: { nodes?: FieldNode[] } } } };
  return data.data?.node?.fields?.nodes?.filter((n) => n && n.id) ?? [];
}

// FR-3.5: 既存 project 内の列（Status option）と text フィールドを確認し、不足分だけ作る。
export function ensureFields(project: ProjectRef, columns: string[]): FieldMap {
  let fields = listFields(project.id);
  for (const name of TEXT_FIELDS) {
    if (!fields.some((f) => f.name === name)) {
      graphql(
        `mutation($pid:ID!,$name:String!){ createProjectV2Field(input:{projectId:$pid, dataType:TEXT, name:$name}){ projectV2Field { ... on ProjectV2FieldCommon { id } } } }`,
        { pid: project.id, name }
      );
    }
  }
  fields = listFields(project.id);
  const status = fields.find((f) => f.name === "Status");
  if (!status) throw new Error("project に Status フィールドが無い（Projects v2 の既定構成を想定）");
  const missing = columns.filter((c) => !(status.options ?? []).some((o) => o.name === c));
  if (missing.length > 0) {
    const merged = buildEnsureStatusOptions(status.options ?? [], columns);
    // 入力型に id フィールドが無いため、id は送らない（既存 option は名前で保持される）
    const optionsArg = merged
      .map(
        (o) =>
          `{name: ${JSON.stringify(o.name)}, color: ${o.color ?? "GRAY"}, description: ${JSON.stringify(o.description ?? "")}}`
      )
      .join(", ");
    graphql(
      `mutation { updateProjectV2Field(input:{fieldId:${JSON.stringify(status.id)}, singleSelectOptions:[${optionsArg}]}){ projectV2Field { ... on ProjectV2FieldCommon { id } } } }`
    );
    fields = listFields(project.id);
  }
  const statusFinal = fields.find((f) => f.name === "Status")!;
  return {
    status: {
      id: statusFinal.id,
      options: new Map((statusFinal.options ?? []).map((o) => [o.name, o.id])),
    },
    text: new Map(
      fields.filter((f) => (TEXT_FIELDS as readonly string[]).includes(f.name)).map((f) => [f.name, f.id])
    ),
  };
}

const LIST_ITEMS_MAX_PAGES = 10; // 100 件/頁 × 10 = 1000 item。暫定機構の想定規模の余裕上限

export function listItems(projectId: string): Map<string, { itemId: string; draftId: string | null }> {
  const out = new Map<string, { itemId: string; draftId: string | null }>();
  let cursor: string | null = null;
  let exhausted = false;
  for (let page = 0; page < LIST_ITEMS_MAX_PAGES; page++) {
    const data = graphql(
      `query($pid:ID!,$after:String){ node(id:$pid){ ... on ProjectV2 { items(first:100, after:$after){ pageInfo{ hasNextPage endCursor } nodes{ id content{ ... on DraftIssue { id title } ... on Issue { title } ... on PullRequest { title } } } } } } }`,
      cursor ? { pid: projectId, after: cursor } : { pid: projectId }
    ) as {
      data?: {
        node?: {
          items?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            nodes?: Array<{ id: string; content?: { id?: string; title?: string } }>;
          };
        };
      };
    };
    const items = data.data?.node?.items;
    for (const n of items?.nodes ?? []) {
      if (n.content?.title) {
        out.set(n.content.title, { itemId: n.id, draftId: n.content.id ?? null });
      }
    }
    if (!items?.pageInfo?.hasNextPage) {
      exhausted = true;
      break;
    }
    cursor = items.pageInfo.endCursor ?? null;
  }
  if (!exhausted) {
    // 打ち切りを黙って返すと未索引の既存カードへ重複 draft を作る。明示エラーで停止する
    throw new Error(
      `project の item が ${LIST_ITEMS_MAX_PAGES * 100} 件を超えており索引を打ち切った（暫定機構の想定規模超過。上限の見直しが必要）`
    );
  }
  return out;
}

function createDraftItem(projectId: string, title: string, body: string): string {
  const data = graphql(
    `mutation($pid:ID!,$title:String!,$body:String!){ addProjectV2DraftIssue(input:{projectId:$pid, title:$title, body:$body}){ projectItem { id } } }`,
    { pid: projectId, title, body }
  ) as { data?: { addProjectV2DraftIssue?: { projectItem?: { id?: string } } } };
  const id = data.data?.addProjectV2DraftIssue?.projectItem?.id;
  if (!id) throw new Error(`draft issue の作成に失敗した: ${title}`);
  return id;
}

// FR-3.4: タイトル一致の item が無ければ draft issue を作成し、全フィールドを上書きする。
export function upsertItem(
  project: ProjectRef,
  fieldMap: FieldMap,
  items: Map<string, { itemId: string; draftId: string | null }>,
  card: IntentCard,
  column: Column
): void {
  const body = buildDraftIssueBody(card);
  let entry = items.get(card.dirName);
  if (!entry) {
    entry = { itemId: createDraftItem(project.id, card.dirName, body), draftId: null };
    items.set(card.dirName, entry);
  } else if (entry.draftId) {
    // 既存 draft の本文も全上書きする（Issue リンク・scope・worktree の陳腐化防止。FR-3.4）
    graphql(
      `mutation($did:ID!,$title:String!,$body:String!){ updateProjectV2DraftIssue(input:{draftIssueId:$did, title:$title, body:$body}){ draftIssue { id } } }`,
      { did: entry.draftId, title: card.dirName, body }
    );
  }
  const itemId = entry.itemId;
  const specs: FieldSpec[] = [];
  const optionId = fieldMap.status.options.get(column);
  if (!optionId) {
    // Status を黙って落とすと「フィールドは最新なのに列だけ古い」カードを作る
    // （FR-3.4 の全上書きに反する）。ensureFields 後に option が無いのは異常なので明示エラー。
    throw new Error(`Status option「${column}」の ID を解決できない（ensureFields 後に不在。board の Status 設定を確認する）`);
  }
  specs.push({ fieldId: fieldMap.status.id, kind: "single_select", optionId });
  const textValues: Record<string, string> = {
    Agent: card.agent,
    Host: card.host,
    Worktree: card.worktree,
    Scope: card.scope,
    Stage: card.stage,
    Issue: card.issues.map((n) => `#${n}`).join(", ") || "-",
    "Synced At": card.syncedAt,
  };
  for (const [name, text] of Object.entries(textValues)) {
    const fieldId = fieldMap.text.get(name);
    if (fieldId) specs.push({ fieldId, kind: "text", text });
  }
  graphql(buildItemFieldMutation(project.id, itemId, specs));
}
