# Code Summary — convergence-budgets

## 実装結果

[#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) の実装をBolt branch `bolt-convergence-budgets` に作成した。

- feature commit: `e7b4f7be556a9395066a832959bdec9b22dc5fe7`
- feature commit message: `feat(convergence): enforce durable execution budgets`
- recovery commit: `61eb3c63c`
- recovery commit message: `fix(bolt): resume partial metadata merges`
- rebase base: `origin/main` の `8448fdc6e59ca0e55b6f701bcec125c5c336fe8b`（#1602 の [PR #2031](https://github.com/amadeus-dlc/amadeus/pull/2031) merge commit）

## 主な作成・変更ファイル

- shared policy/runtime: `packages/framework/core/tools/amadeus-convergence-policy.ts`、`amadeus-convergence-runtime.ts`
- lifecycle／hook integration: `amadeus-execution-lifecycle.ts`、`amadeus-stop.ts`、`amadeus-swarm.ts`
- partial merge recovery: `amadeus-merge-recovery.ts`、`amadeus-bolt.ts`、`amadeus-audit.ts`
- tests: Stop cap／audit noise、C2 atomic reserve、retry allowlist／budget、partial metadata merge recovery、既存worktree／swarm回帰
- distribution: 7 harnessのpackageと影響するself-install面。すべて正本から生成した。

## 主要な設計判断

- Codexで顕在化した問題だが、budget、termination、retry predicateは共有coreの単一契約とし、Codex専用gate／専用hard capを追加しない。
- Stop budgetはstage identityへ結び付け、audit shard行数、session、worker、resume／compactでresetしない。cap回目を許可し、cap+1開始を拒否してcounterをcapに保持する。
- retryは4 fact完全一致のv1 allowlistだけを許可し、default 2、hard 3の別budgetを開始前にreserveする。unknown、effect possible、auth／permission／config／validation、canonical write failureは自動retryしない。
- 非allowlist／unknownはcounterを消費せず、共有reasonとrecommended next actionを持つtyped refusalを返す。
- partial metadata mergeは、Bolt Refs、canonical `STATE_MERGED`、worktree path／hash、`AUDIT_FORKED` anchor、`AUDIT_MERGED`をshard横断で一意検証できる場合だけ再開する。重複／不一致／tamperはfail-closedにする。

## テスト結果

- #1998対象test: 145 pass / 0 fail（初期feature収束時）
- partial finalize recovery関連: 16 pass / 0 fail（最終修正後）
- feature full `test:ci`: 744 files、10,020 assertions、0 failures
- recovery verbose full: 745 files、10,026 assertions中、追加testのcoverage whitelist漏れ1件のみ。修正後の該当testは2 pass / 0 fail、その他のfailureは0件
- `bun run typecheck`: exit 0
- `bun run lint`: exit 0。既存warningのみで、`handleComplete`はCCN 12
- `bun scripts/package.ts --check`: 7 harness pass
- `bun run promote:self:check`: pass
- coverage／complexity／diff check: pass
- swarm referee: 対象test＋typecheckで `converged:true`、`tampered:false`
- partial recovery後のswarm finalize: converged 1、failed 0、merge failure 0

## 計画との差分

- 誤中断でroot clone cursorが再生成され、最初のfinalizeがstate merge後・audit merge前で停止した。自動ソロ選挙 `E-CDBCBF` と `E-CDBCBF2` はいずれもRetryを2–0で裁定した。
- これを場当たり的なstate編集で復旧せず、部分mergeの一意な正規証拠を検証するidempotent recoveryとして製品化し、実際のIntentでdogfoodした。
- full suiteはrefereeの固定60秒枠を超えるため独立証跡とし、refereeには対象test＋typecheckを使用した。

## 残課題

製品実装上の残課題はない。question／follow-up／review budgetはUnit 3、bounded Unit poolはUnit 4で本Unitの共有contractへ接続する。
