# Domain Entities — unit merge-provenance

## 本 unit が所有する型

```ts
// component-methods.md C11 のシグネチャをそのまま採用
interface DelegatedMergeEvidence {
  readonly standingRulingRef: string;   // 例: "cid:ci-pipeline:standing-merge-approval-ci-green"
  readonly ciConclusion: string;        // 実測値(例: "success")
  readonly convergedDigest: string;     // pr-convergence の converged 判定参照(呼出側が計算・保持)
}

interface AuditReceipt {
  readonly eventId: string;
  readonly committedAt: string;         // ISO 8601
}

type RecordDelegatedMergeRefusal =
  | { readonly kind: "evidence-incomplete"; readonly missingField: keyof DelegatedMergeEvidence }
  | { readonly kind: "event-unregistered" };   // event-registry 登録漏れ(fail-closed 保険)

recordDelegatedMerge(
  evidence: DelegatedMergeEvidence,
): { readonly ok: true; readonly receipt: AuditReceipt } | { readonly ok: false; readonly error: RecordDelegatedMergeRefusal };
```

## 新規監査イベント種(登録対象 — Q3)

```
DELEGATED_MERGE_RECORDED
  必須フィールド: Standing Ruling Ref, CI Conclusion, Converged Digest
  発行元: recordDelegatedMerge()(本 unit の唯一の emit 経路)
```

- 既存の `WORKTREE_MERGED`/`STATE_MERGED`/`AUDIT_MERGED`/`MERGE_DISPATCH_*` とは並列の別種であり、意味論上の親子関係・置換関係を持たない(reality-check で確認済み: いずれも Bolt worktree 内部操作)。

## 不変条件

- `DelegatedMergeEvidence` の3フィールドはすべて非空文字列(parse-don't-validate — 構築不能な状態を型で表現)。
- `AuditReceipt` は append-only な監査行の committed 事実のみを表す(state ファイルの書換を伴わない — R-3)。

## 意図的に NOT モデル化するもの

- 委任条件そのものの判定ロジック(CI green ∧ converged:true の計算)— team.md 常任承認ノルムと pr-convergence プラグインの責務であり、本 unit は実測値を受け取るだけ(R-1)。
- GitHub 上の実際のマージ操作(`gh pr merge` 等)— core のスコープ外(bound-surfaces が明示する「core 側の provenance 記録形式のみ」)。
- マージ失効・撤回のワークフロー — ADR-10「失効=ユーザー撤回宣言」はユーザー裁定プロセスの記述であり、本 unit がコード上の失効機構を持つ必要はない(記録は一度きりの事実の append)。
