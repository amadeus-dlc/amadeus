# Component Methods — Intent Mirror の GitHub Project Status 同期

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

components.md の割付を主要関数シグネチャへ落とす。命名・様式は component-inventory / architecture の実測既習形(argv ビルダー・GatewayOutcome・reducer transition)に合わせる。シグネチャは設計意図の表現であり、最終形は実装時に TypeScript 型検査で確定する。

## C0 types(追加型)

```ts
type MirrorProjectRef = { owner: string; number: number };            // "amadeus-dlc/5" の parse 結果
type MirrorPhaseKey = "ideation" | "inception" | "construction" | "operation" | "done";
type MirrorProjectStatusNames = Partial<Record<MirrorPhaseKey, string>>;
type MirrorProjectTarget = { project: MirrorProjectRef; statusNames: MirrorProjectStatusNames };
type MirrorProjectSyncEntry = {
  project: string;                 // canonical "owner/number"
  projectId: string; itemId: string | null;
  lastAppliedStatus: string | null;
  state: "synced" | "pending" | "safety-blocked";
  updatedAt: string;
};
type MirrorProjectStatusField = { projectId: string; fieldId: string; options: ReadonlyArray<{ id: string; name: string }> };  // E-U1CG 是正: projectId 追加
type MirrorProjectItem = { projectId: string; projectNumber: number; projectOwner: string; itemId: string; currentStatus: string | null };
type ExpectedProjectStatus = { kind: "status"; name: string } | { kind: "keep" };
```

## C1 config

```ts
// 4面一般化(ADR-2): allowlist / MirrorConfig / MirrorConfigIssue / readFailure
type MirrorConfig = { autoMirror: MirrorMode; projects: readonly MirrorProjectTarget[] };  // projects 既定 []
parseMirrorConfigLayers(inputs): { config: MirrorConfig; issues: MirrorConfigIssue[]; sources: ... }
// "mirror-projects" 値の検証: 配列 / project 形式 "<owner>/<number>" / status-names キーは MirrorPhaseKey closed set
```

## C2 policy(canonical 導出 — ADR-5)

```ts
const DEFAULT_PROJECT_STATUS_NAMES: Record<MirrorPhaseKey, string>;  // FR-3a の表(唯一の定義)
expectedProjectStatus(snapshot: MirrorSnapshot, boundaryKind: MirrorBoundary["kind"], statusNames: MirrorProjectStatusNames): ExpectedProjectStatus
// keep: boundaryKind==="parked" || snapshot.registryStatus==="parked"(FR-4)
// done: landing 判定(registryStatus==="complete" && status==="Completed")→ statusNames.done ?? "Done"
// else: lifecyclePhase(大文字)→ MirrorPhaseKey へ写像 → statusNames[phase] ?? 既定表
```

## C5 gateway(GraphQL 族 — ADR-4)

```ts
graphqlArgv(query: string, variables: Record<string, string>): readonly string[]
// ["api","graphql","--include","-f",`query=${query}`, ...variables を "-F"/"-f" で]

// MirrorGitHubGateway へ追加。消費者棚卸し(reviewer 実測 grep "implements MirrorGitHubGateway" で確定):
// interface 実装クラス4箇所の全数更新が必要 — t279 FakeGateway / t282 LifecycleGateway / t284 RepairGateway / t300 FakeGateway。
// t280 は `{} as MirrorGitHubGateway` の型キャストで型検査に強制されないため、手動で挙動確認を追加する:
listProjectItems(issue): Promise<GatewayOutcome<{ issueNodeId: string; items: readonly MirrorProjectItem[] }>>  // E-U1CG 是正: 単一クエリで issue node id を同時取得
resolveProjectStatusField(project: MirrorProjectRef): Promise<GatewayOutcome<MirrorProjectStatusField>>
addProjectItem(permit, projectId, issueNodeId): Promise<GatewayOutcome<{ itemId: string }>>       // 冪等(FR-2a)
updateProjectItemStatus(permit, projectId, itemId, fieldId, optionId): Promise<GatewayOutcome<void>>

interpretGraphqlResult(parse: EnvelopeParse): GraphqlBodyOutcome
// HTTP 200 + body.errors[] を MirrorFailureClass へ写像(FR-7d — 写像表は実 gh 応答の実測で確定)
```

## C6 executor(内部ステップ — ADR-1)

```ts
syncProjects(ctx): Promise<ProjectSyncStepResult>
// 手順: listProjectItems → (対象 Project で未所属なら addProjectItem → 即 updateProjectItemStatus)
//     → 各同期対象 Project: resolveProjectStatusField → exact match(FR-6a)
//     → expectedProjectStatus が keep なら skip / 一致済みなら mutation 省略(FR-3e)
//     → updateProjectItemStatus → projectSync 台帳 upsert
// 失敗分類: 解決不能 → safety-blocked / retryable → pending(FR-7)
completionProjectGate(state): { ready: boolean; blocking: readonly string[] }   // FR-8: 全同期対象が Done 適用済みか
```

## codec / reducer

```ts
// codec: ROOT_KEYS += "projectSync"、PROJECT_SYNC_KEYS / PROJECT_ENTRY_KEYS の closed set、validate + render の3面(ADR-3)
// reducer transitions(3種):
{ kind: "upsert-project-entry"; entry: MirrorProjectSyncEntry }
{ kind: "mark-project-pending"; project: string; updatedAt: string }
{ kind: "mark-project-safety-blocked"; project: string; updatedAt: string }
```

## C3 lifecycle(repair status 拡張)

```ts
// runRepairStatus の outcome へ追加(read-only — FR-9b、mutation 呼び出し 0 を negative assert):
projectDiagnostics: readonly {
  project: string;
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;        // expectedProjectStatus を共有消費(FR-9c)
  drift: boolean;
  resolution: "resolved" | "field-missing" | "option-missing" | "permission-denied";
  availableOptions?: readonly string[]; // option-missing 時の診断(FR-6c)
}[]
```

## C8 presentation

```ts
// MIRROR_USER_CONTRACT: 設定キー mirror-projects の説明・repair status の Project 診断項目を追記
// scopeExclusions(pull-request/release/deploy/daemon/polling)は不変(FR-10a parity テスト維持)
```

## 呼び出し回数の設計値(NFR-3 の数値固定)

上限は **per-Project で固定**する(boundary 全体の総和は per-Project 上限×Project 数から導出される従属値であり、独立の上限を置かない):

- 共通: `listProjectItems` は boundary あたり **1回**(全 Project 分を一括照会)。
- **Project あたり上限**: `resolveProjectStatusField` **1回** + mutation **≤2回**(未所属の対象 Project の場合: `addProjectItem` 1+`updateProjectItemStatus` 1 / それ以外: `updateProjectItemStatus` ≤1 — 既一致なら 0)。
- したがって同期対象 N・うち未所属の対象 Project M のとき、boundary 総 mutation は ≤ N+M(M 件の追加が同一 boundary で発生しうる — FR-2 の Project 独立判定による。M≤N)。

テストは **per-Project の呼び出し回数上限**(照会1+mutation≤2)を FakeGateway の history 検査で assert する(NFR-3 受入基準)。

> **E-U1CG 追記(2026-07-27T11:50:05Z)**: U1 実装時の builder 停止報告(addProjectItem 引数供給元不在)に対する一次証拠裁定。listProjectItems の戻り形と MirrorProjectStatusField を上記のとおり是正(NFR-3 予算維持の一意解)。owner 解決は organization 固定(実測裁定 — u1 FD business-logic-model の裁定節参照)。
