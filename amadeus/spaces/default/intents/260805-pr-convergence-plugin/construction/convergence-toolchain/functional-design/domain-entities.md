# Domain Entities: convergence-toolchain(U2)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

スタイル: functional-domain-modeling-ts(ブランド型+スマートコンストラクタ、判別 union Result、parse-don't-validate)。所在: `plugins/pr-convergence/tools/` の4ファイル(components C3/C4/C5/C6)。Unit 境界と担当 FR は unit-of-work の U2 定義に従い(core 非依存・前進判定なし)、FR/NFR 対応は unit-of-work-story-map の U2 列に対応する(FR-3/FR-4/FR-5 CLI 面/FR-7/NFR-2/NFR-3)。

## エンティティ(型)一覧

### ThreadClass(判別 union — C3 所有)

```ts
type ThreadClass = "resolved" | "outdated" | "replied-unresolved" | "ignored";
```

FR-3a の4区分。`outdated` は独立区分(無音で落とさない)。

### Severity(判別 union — C4 所有)

```ts
type Severity = "critical" | "major" | "minor" | "info";
```

bot コメントの構造化 severity 表記(例: CodeRabbit の「⚠️ Potential issue」ヘッダ内ラベルや `**Severity:**` 行)からの正規化写像。写像は `Severity.parse(raw: string): Severity | null` の1関数が所有し、写像不能な表記は null(推測で埋めない — BR-U2-10)。実際の bot 出力語彙は実 PR 実測 fixture(A-1)で確定し、写像表をテストで固定する。

### ReviewThread(parse 済み入力 — C4 所有)

```ts
type ReviewThread = {
  readonly id: ThreadId;                  // ブランド型
  readonly isResolved: boolean;
  readonly isOutdated: boolean;           // force-push で行が消えた thread
  readonly comments: readonly ThreadComment[];
};
type ThreadComment = {
  readonly authorTypename: string;        // GraphQL __typename の生値
  readonly authorLogin: string;
  readonly bodyDigest: string;            // 本文は保持しない(台帳肥大・機微混入防止)— severity/terminalRefs 抽出後に digest 化
  readonly severity: Severity | null;     // bot コメントの構造化値の転記(FR-3d)
  readonly terminalRefs: readonly string[]; // 本文中の PR/commit 参照(#\d+ / 7-40 桁 hex)— terminalized() の判定材料(FR-4c)
};
```

GraphQL 生 JSON からのスマートコンストラクタ `ReviewThread.parse` が唯一の生成経路(parse-don't-validate — 無効形は typed error)。語彙は実 PR 実測 fixture が契約の正本(A-1)。

### ThreadLedger(first-class collection — C4 所有)

```ts
type ThreadLedger = {
  readonly prRef: PrRef;
  readonly threads: readonly ClassifiedThread[];   // ThreadClass 付与済み(bot 起点スレッドのみ)
  readonly humanOnly: readonly ThreadId[];         // bot コメント不在スレッド(収束分母外 — 分類対象外を無音で落とさない)
  count(cls: ThreadClass): number;
  violating(): readonly ClassifiedThread[];        // replied-unresolved ∪ ignored
  terminalized(): readonly ClassifiedThread[];     // 終端処理済み
};
```

生成は `ThreadLedger.build(threads)` のみ(手書き禁止 = 生成経路の単一化)。`terminalized()` の判定材料: `isResolved === true` ∧ 最後の非 bot 返信の本文に PR/commit 参照パターン(`#\d+` または 7-40 桁 hex の commit SHA 形)が存在すること — 参照パターンの抽出は bodyDigest 化の前に行い、抽出結果(`terminalRefs: readonly string[]`)を ThreadComment に保持する(FR-4c。#1887 の一次入力互換)。

### ConvergenceVerdict(C3 所有)

```ts
type ConvergenceVerdict = {
  readonly converged: boolean;
  readonly violating: { readonly repliedUnresolved: number; readonly ignored: number };
  readonly mergeState: MergeStateStatus;           // 既知値のみ(未知値は parse 時 throw — fail-closed)
  readonly mergeableResolution: "resolved" | "unknown-exhausted";
};
```

`MergeStateStatus` の正規化(FR-3c / OQ-2)は **ADR-2 の裁定どおり意図的別定義** — plugin 内の `MergeStateStatus.parse` が既知値集合(CLEAN / BEHIND / BLOCKED / DIRTY / DRAFT / HAS_HOOKS / UNSTABLE / UNKNOWN)のみを受理し未知値は throw する。metrics 側 `parseMergeability`(scripts/metrics-publication-domain.ts — repo-only、t258 境界により import 不可)とは消費者・出力語彙が異なる平行定義であり、「未知値 fail-closed」「UNKNOWN を成立扱いしない」の意味論共通性は双方のテストで独立に固定する(FD 側トレーサビリティの明記 — reviewer FOLLOW-UP 対応)。

### PrState / PrRef / GhRunner(C6 所有)

```ts
type PrRef = { readonly repo: string; readonly number: number };   // ブランド型 PrNumber
// PrState の所有【E-PCP-CGDEV 解釈確定 2026-08-05】: C6 は raw 文字列 {mergeable, mergeStateStatus} の
// 取得(fetchRawPrState)まで。型付き PrState は C3 の MergeStateStatus.parse が生成(RUNNER 葉性の維持)
type PrState = { readonly mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"; readonly mergeStateStatus: MergeStateStatus };
type GhRunner = (argv: readonly string[]) => Promise<Result<string, GhError>>;
type GhError =
  | { readonly kind: "not-runnable" }
  | { readonly kind: "not-authenticated" }
  | { readonly kind: "command-failed"; readonly exitCode: number; readonly stderrDigest: string };
```

`GhRunner` は plugin 内定義(ADR-6 — core gateway の型を import しない)。

### ConvergenceReport(C5 所有 — record へ書かれる成果物の型)

```ts
type ConvergenceReport =
  | { readonly kind: "converged"; readonly verdict: ConvergenceVerdict; readonly ledgerSummary: LedgerSummary; readonly generatedAt: string }
  | { readonly kind: "override"; readonly verdict: ConvergenceVerdict; readonly override: OverrideRecord; readonly generatedAt: string };
type OverrideRecord = { readonly humanTurnId: string; readonly reason: string; readonly recordedAt: string };
```

レポート md はこの型からの機械 render のみ(A-3 — 手書きは様式検査で偽装扱い)。override は `converged: false` を恒久記録(FR-7b)。

## 不変条件

1. `converged === true` ⇔ `violating.repliedUnresolved === 0 ∧ violating.ignored === 0 ∧ mergeState === "CLEAN" ∧ mergeableResolution === "resolved"`(FR-3b の単一定義)
2. `mergeStateStatus` の未知値は型に入らない(parse 時 throw — ADR-2)
3. bot 判定は `authorTypename === "Bot"` のみ(静的 login 列挙禁止 — FR-4a)
4. ThreadLedger の要素は必ず ThreadClass を持つ(未分類 thread は表現不能)
