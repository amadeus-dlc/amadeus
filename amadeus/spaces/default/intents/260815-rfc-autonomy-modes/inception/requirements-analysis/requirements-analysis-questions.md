# Requirements Analysis — Questions(intent 260815-rfc-autonomy-modes)

> 承認: 2026-08-15T15:55:00Z — ユーザー実 HUMAN_TURN(AskUserQuestion、本セッション)。RFC-0001「Unresolved questions」のうち人間専権級 3 問を裁定。残る設計裁定質問(Q2/Q4/Q5/Q7/Q8/Q10/Q11/Q14/Q15/Q18/Q19)は application-design 段の選挙・裁定対象として requirements は resolution-neutral に保つ(cid:requirements-analysis:c3-measurable-ac-must-not-void-ruling)。

## Q6: マージ委任条件の正本

- A. **既存ノルムを正本化** — 常任マージ承認(team.md、2026-08-15 ユーザー直接裁定: 必須 CI green ∧ converged:true 実測)を条件付き委任の唯一の正本とし、RFC 実装は provenance 記録形式(委任根拠 HUMAN_TURN 参照)の機械化のみ追加。定義者 = ユーザー直接裁定のみ、失効 = ユーザー撤回宣言
- B. 新設 config キー
- C. 委任なし(毎回人間承認へ戻す)

[Answer]: A(ユーザー選択「既存ノルムを正本化(推奨)」)

## Q9: degrade スコープの walking-skeleton ゲート

- A. **Stance に従属** — WS ゲートは Skeleton Stance に従い、degrade スコープでは発火しない(org.md「スケルトンのセレモニーをスキップ」と整合、実測 66 件の機構起因停止クラスを解消)
- B. 現行維持(scope 非参照)

[Answer]: A(ユーザー選択「Stance に従属(推奨)」)

## Q12/Q13: スコープ外確認

- A. **スコープ外で確定** — Q12(Grill me の semi/full 非提示)と Q13(intent birth / compose 承認の人間専権)はどちらも現状維持で本 intent では触らない
- B. スコープに含める

[Answer]: A(ユーザー選択「スコープ外で確定(推奨)」)
