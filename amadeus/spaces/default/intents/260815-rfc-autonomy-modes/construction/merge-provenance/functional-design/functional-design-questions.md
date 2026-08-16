# Functional Design — Questions(unit merge-provenance)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: 委任条件の正本の扱い

- A. 新設 config・新設 policy キーは一切作らない。委任条件の判定(必須 CI green ∧ pr-convergence の `converged: true`)自体は team.md の常任マージ承認ノルム(learnings inbox `cid:ci-pipeline:standing-merge-approval-ci-green`)が定める通りであり続け、本 unit はその条件が成立して実際にマージが実行された**後**の provenance 記録のみを機械化する
- X. Other

[Answer]: A — ADR-10「委任条件の正本は team.md 常任承認ノルムのみ。実装は委任実行記録の provenance 機械化に限定し、新設 config なし」。FR-9 も同旨。

## Q2: provenance 記録の発生源(core 側の記録面)

- A. マージ実行そのもの(`gh pr merge` 等の実行)は pr-convergence プラグイン側または人間操作であり本 intent のスコープ外(bound-surfaces は「core 側の provenance 記録形式のみ」)。core 側が提供するのは、マージ実行者(人間または委任実行主体)が呼び出す `recordDelegatedMerge(evidence)` という記録専用の API/CLI 面のみで、マージという git 操作自体を core が代行・トリガーすることはない
- X. Other

[Answer]: A — component-methods.md C11「recordDelegatedMerge(evidence): AuditReceipt」は記録関数であり実行関数ではない。ADR-10「記録面は record/audit(本 intent は core 側の provenance 記録形式のみ)」の文言どおり core は記録責務のみを持つ。

## Q3: 新設監査イベント種の要否

- A. 既存の `amadeus-audit.ts append` は `unregisteredEventRejection`(`amadeus-audit.ts:573`)により未登録イベント種を fail-closed で拒否する構造のため、`recordDelegatedMerge` が書く行は新規イベント種(例: `DELEGATED_MERGE_RECORDED`)として event-registry(`packages/framework/core/otel/event-registry.ts`)+ `audit-format.md` に登録する必要がある。既存の `WORKTREE_MERGED`/`STATE_MERGED`/`AUDIT_MERGED`(Bolt worktree の内部マージ)や `MERGE_DISPATCH_*`(Bolt マージ戦略選定)とは意味が異なる(あちらは Bolt worktree → 本線 state のマージ、こちらは PR → GitHub 本線のマージ委任)ため、既存種の転用はしない
- X. Other

[Answer]: A — `amadeus-audit.ts:573` の unregisteredEventRejection ゲートは実測済みの fail-closed 契約であり、既存 3+3 イベント種の意味論(reality-check で確認: すべて Bolt worktree 内部マージ)が本 unit の対象(PR delegated merge)と異なるため転用は意図ベースの重複排除に反する。新設イベント種は本 unit の見積り(~60 行)に含まれる小さな追加。

## Q4: 呼出主体と呼出タイミング

- A. `recordDelegatedMerge` の呼出主体は conductor(このワークフローを回す人間役 AI)であり、マージが実行された事実(CI conclusion・converged digest を実測した後)を確認してから呼び出す。呼出は amadeus-bolt.ts の新規 CLI subcommand(例: `record-delegated-merge`)経由とし、`hold-merge`/`release-merge`(Bolt worktree マージ保留 — 別機構、reality-check で確認済み)とは独立に追加する
- X. Other

[Answer]: A(一部 handed-off) — FR-9 受け入れ確認「委任条件を満たすマージの記録に委任根拠参照が残ること」は呼出主体を規定していないため、CLI subcommand 名の具体は code-generation へ委譲する。`hold-merge`/`release-merge` との非混同(reality-check: `amadeus-bolt.ts:803-817` は Bolt worktree の merge-held フラグ操作であり PR マージとは無関係)のみを設計制約として確定する。
