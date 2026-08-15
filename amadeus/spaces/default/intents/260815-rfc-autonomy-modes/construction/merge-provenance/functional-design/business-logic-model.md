# Business Logic Model — unit merge-provenance

## 現状(reality-check)

- 既存の `*_MERGED` 系監査イベント(`WORKTREE_MERGED` / `STATE_MERGED` / `AUDIT_MERGED` — `audit-format.md:222,225,227`)はいずれも「Bolt の worktree を本線 state へマージする」内部操作を指す(`tools/amadeus-worktree.ts` の `merge` / `amadeus-state.ts` の `merge` / `amadeus-audit.ts` の `audit-merge`)。PR を GitHub 上でマージする操作とは無関係。
- `MERGE_DISPATCH_*`(`audit-format.md:246-248`、`event-registry.ts:865-886`)は Bolt のマージ「戦略」(strategy/target branch)を pipeline-deploy エージェントへ委任する経路であり、これも GitHub PR マージの provenance ではない。
- `amadeus-bolt.ts:803-817` の `hold-merge`/`release-merge` は Bolt worktree の `Merge-Held` フラグ操作 — PR マージ実行そのものとは別機構。
- `amadeus-audit.ts:566-579`(`handleAppend`)は `unregisteredEventRejection`(:573)により、event-registry に登録されていないイベント種の追記を fail-closed で拒否する。新規イベント種を core が受け付けるには登録が要る。
- team.md の常任マージ承認ノルム(`cid:ci-pipeline:standing-merge-approval-ci-green`、learnings inbox)は「必須 CI green ∧ pr-convergence の `converged: true`」を委任条件の正本として既に確定している。convergedDigest 等 pr-convergence 固有の値は core 側コード(`grep` 実測: 0 hit)に存在せず、プラグイン側でのみ計算される。

## 処理フロー

```
[人間 または 委任実行主体] が委任条件成立(CI green ∧ converged:true)を実測し、
GitHub 上で PR マージを実行(この操作自体は core のスコープ外)
  │
  ▼
conductor が recordDelegatedMerge(evidence) を呼び出す
  evidence = {
    standingRulingRef: "cid:ci-pipeline:standing-merge-approval-ci-green",
    ciConclusion: "success",              # 実測値(CI 結果)
    convergedDigest: "<pr-convergence が出した converged 判定の参照>",
  }
  │
  ▼
recordDelegatedMerge()
  ├─ evidence の必須フィールドを検証(空文字列・欠落は拒否)
  ├─ 新規監査イベント種(Q3)を event-registry 経由で emitCanonicalAuditEvent へ渡す
  ├─ record の audit shard へ append-only で1行追加
  └─ AuditReceipt { eventId, committedAt } を返す
```

## 統合面

- 依存なし(unit-of-work-dependency.md: U10 blockedBy = 空、直列化制約も空)。他 unit の共有ファイル(`amadeus-bolt.ts`/`amadeus-intent-autonomy.ts`/`amadeus-orchestrate.ts`)に触れない独立小物。
- 消費者: pr-convergence プラグイン(またはマージを実行した人間)が「委任マージを行った」事実を core の audit trail に残したいときに呼ぶ。本 RFC のスコープでは core 側の記録面のみを提供し、pr-convergence プラグイン自体の改修は行わない。

## エラーパス(fail-closed semantics)

- `evidence` の必須フィールド(`standingRulingRef` / `ciConclusion` / `convergedDigest`)いずれかが欠落・空文字列の場合は記録を拒否する(委任根拠なきマージの無記録通過を防ぐ)。
- 新規イベント種が event-registry に未登録のまま呼ばれた場合、`amadeus-audit.ts` の既存 fail-closed ゲート(:573)がそのまま働く — 本 unit が独自の緩い経路を新設することはない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:56Z
- **Iteration:** 1
- **Scope decision:** none

merge-provenance は ADR-10 の記録専用スコープ(新設configなし・git操作代行なし)を厳守し、既存 *_MERGED / MERGE_DISPATCH_* との非転用理由も実測で裏付け。

### Findings

- None
