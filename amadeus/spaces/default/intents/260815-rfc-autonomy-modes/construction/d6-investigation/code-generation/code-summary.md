# Code Summary — unit d6-investigation

> 実装: swarm batch 1(builder sw-d6-investigation、worktree bolt-d6-investigation)。コード変更 0 — record 成果物のみ。

## 成果物
- `construction/d6-investigation/investigation-report.md`(機序 / 一次証拠(file:line・逐語)/ 再現手順 / 判定 / 帰属 / Issue draft ×2)

## 判定(実測)
- **判定 A(重複発火): 欠陥・実装帰属** — `INTENT_AUTONOMY_HUMAN_REQUIRED` が projection 読取のたびに無条件 append(認可側 :805-806 の occurrence 単位抑止と非対称)。RFC 付録 B の 172 件系計数の系統的過大計上の原因
- **判定 B(空振り承認): 欠陥・設計帰属(宣言と執行の未結線)** — autonomy 層の SCOPE_OUT 宣言が承認可否に影響せず、実効判定は `humanActedSinceGate`(「人間がこのターンで何か打った」)のみ。コーパス 32 件(semi milestone 15 件)+ scratch 決定的再現
- スコープ外記録: `authorizeApproval` override 経路と approve-batch の presence 素通り(FR-12 / U6 が閉鎖)

## 検証
- swarm check / finalize: converged(コード変更 0 の機械確認 — `git diff --name-only main...HEAD | grep -v '^amadeus/'` = 0 行)
- Issue 起票: 未実施(draft 2 本を report §6 に保持 — 規律どおりユーザー決定待ち)
