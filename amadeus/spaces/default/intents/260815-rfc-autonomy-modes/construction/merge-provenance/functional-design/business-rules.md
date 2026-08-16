# Business Rules — unit merge-provenance

- R-1(ADR-10・FR-9): 委任条件(必須 CI green ∧ pr-convergence の `converged: true`)の正本は team.md 常任マージ承認ノルムのみとし、本 unit は新設 config・新設 policy キーを一切作らない。
- R-2(ADR-10): 本 unit の責務はマージ実行後の provenance 記録のみに限定する。GitHub 上の PR マージ実行そのものを core がトリガー・代行しない。
- R-3(Q2): `recordDelegatedMerge` は記録専用の API であり、副作用として git/GitHub への書込を一切行わない。
- R-4(Q3): 記録に使う監査イベント種は新規登録する — 既存の `WORKTREE_MERGED`/`STATE_MERGED`/`AUDIT_MERGED`(Bolt worktree 内部マージ)、`MERGE_DISPATCH_*`(Bolt マージ戦略委任)のいずれも意味が異なるため転用しない。
- R-5(FR-9 受け入れ確認): 委任条件を満たしたマージの記録には委任根拠(`standingRulingRef` — 常任承認ノルムの cid 参照)と実測値(`ciConclusion` / `convergedDigest`)が残ること。
- R-6(FR-9 無退行): 委任条件が不成立の場合の人間承認要求フローは本 unit による変更を受けない — `recordDelegatedMerge` はあくまで「委任条件成立後」の事後記録であり、条件判定ロジック自体を core に持ち込まない。
- R-7: `evidence` の必須フィールドいずれかが欠落・空の場合は記録を拒否する(fail-closed — 根拠なき記録の通過を禁止)。

## 落ちる実証(Red の期待)

- 現行: 委任マージの provenance を core 側で記録する専用 API が存在しないこと(`grep -n "recordDelegatedMerge\|DELEGATED_MERGE" packages/framework/core` が 0 hit であること)を実測する。
- 導入後: 正しい evidence での呼出が `AuditReceipt` を返し、record の audit shard に新規イベント種の行が append-only で1行追加されることを pin する。
- fail-closed の Red→Green: `evidence.ciConclusion` を空文字列にした呼出が拒否されること(Red で現状 API 不在のため呼べないことをまず示し、導入後は拒否を pin)。
- 委任条件不成立時の無退行: 既存の人間承認要求フロー(FR-9 の対象外部分)がテストの前後で変化しないことを既存テストの Green 維持で確認する。
