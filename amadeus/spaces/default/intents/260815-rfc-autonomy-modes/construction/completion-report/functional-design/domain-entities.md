# Domain Entities — unit completion-report

## 本 unit が所有する型

```ts
// component-methods.md C9 のシグネチャをそのまま採用(署名は refine しない)
// 〔事後注記 2026-08-16: この pin は同一ブロック内の SummaryBuildError 型と
// 不変条件「生成失敗は SummaryBuildError を経て警告フィールドへ」と両立不能
// (素の SummaryDoc 戻り値にエラー経路がない)で、かつ本文書が命じる
// listProductionAutoDecisions 消費は projectDir を必須とする — 起草時の
// 自己矛盾。実装署名 (pd, recordDir) + Result 化は E-260816-C9-SIGNATURE
// 1-1 tie のユーザー裁定 B(強制適応の追認)で確定。詳細は
// code-generation/code-summary.md 申し送り節〕
buildAutoDecisionSummary(recordDir: string): SummaryDoc;

interface SummaryDoc {
  readonly recordDir: string;
  readonly generatedAt: string;              // ISO 8601
  readonly totalAutoDecided: number;          // AUTO_DECIDED 監査行の実測件数
  readonly byBasisKind: Readonly<Record<AutoDecisionRecord["basisKind"], number>>;
  readonly byReviewState: Readonly<Record<DecisionReviewState | "accepted" | "flagged", number>>;
  readonly countMismatch: { readonly auditRows: number; readonly listedItems: number } | null;
}

type SummaryBuildError =
  | { readonly kind: "record-dir-unresolved" }
  | { readonly kind: "list-api-error"; readonly detail: string }
  | { readonly kind: "write-failed"; readonly detail: string };
```

## 再利用する既存型(refine しない — component-methods.md からそのまま消費)

- `AutoDecisionRecord`(`amadeus-intent-autonomy.ts:777-791`)— `basisKind`・`decider`・`reviewState` フィールドをそのまま集計キーに使う。
- `DecisionSummary` / `DecisionPage`(`amadeus-autonomy-review.ts:176-222`)— `listProductionAutoDecisions` の戻り値をそのまま反復消費する。redaction 済みフィールド(`safeQuestion` 等)は本 unit では使わない(件数集計のみで内容表示はしない)。

## 不変条件

- `totalAutoDecided` は `byBasisKind` の値の合計と常に一致する(集計元が単一の監査行走査であるため構成的に保証)。
- `countMismatch` が non-null のとき、レポート本文に不一致の事実が明記される(黙示の握りつぶし禁止 — R-8)。
- `SummaryDoc` は非 blocking の成果物であり、生成失敗は `SummaryBuildError` を経て completion JSON の警告フィールドへ落ちるのみで、`WorkflowPreparationGuardContext` / `WorkflowAuthorizationGuardContext`(`amadeus-state.ts` の既存ガード型)には一切関与しない — 完了可否の判定ロジックとは独立である。

## 意図的に NOT モデル化するもの

- 個々の AUTO_DECIDED 決定の内容(質問文・選択肢・根拠 fingerprint)の再掲 — 本 unit は件数集計のみで、詳細参照は既存の `get-auto-decision` / `review-auto-decision`(`amadeus-bolt.ts:1111,1137`)に委ねる。
- 過去 intent を横断した集計 — `recordDir` 単位(1 intent 分)に閉じる。複数 intent の横断ダッシュボードは本 unit のスコープ外(RFC-0001 の ADR-3 は単一完了境界の検収点としてのみ言及)。
- reviewState の遷移履歴(いつ unreviewed → accepted になったか)— 現時点のスナップショット件数のみを扱う。
