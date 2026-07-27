# Build and Test Results — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md(検証対象コマンドの導出元)、code-summary.md(CG 段実測との対照)。

測定 ref: worktree `../fix-1569-install-doc` HEAD = `b7f1d996b`(ブランチ fix/1569-install-doc-mismatch)、PR #1579。

## ローカル実測(B&T 段 fresh 再実行、2026-07-27)

| コマンド | exit code |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run promote:self:check` | 0 |
| `bun run dist:check` | 0(CG 段 conductor 実測、B&T では CI の Dist and self-install drift pass で代替確認) |
| 対象+連動テスト 7ファイル(t307/t299/t302/t310-check-plugin-projections/t311-zero-plugin-byte-identical/t328/t338) | 全 pass(44 tests: 31across3 + 13across4、`Ran N tests across M files` 照合済み・全パス実在を事前機械確認) |

注: 当初 t310/t311 を旧名で指定し 3/5 ファイル実行の無音除外が発生 — Ran 照合で検知し正名へ是正(diary 記録済み)。

## PR #1579 CI(最終、re-run 後)

pass 16 / skipping 3(Cursor Bugbot・Formal model check・Metrics Snapshot)/ fail 0 / pending 0(`gh pr checks --json bucket` 機械集計)。

- 初回 run で Coverage Report (head) が赤 → ジョブログ実文で `t258-lifecycle-transaction.test.ts:475` の 100-child p95 テスト 120s タイムアウト(136s)と帰属確定。本変更(plugin 文言・定数・t307)と無関係の負荷起因フレーク。`gh run rerun --failed` で pass(再帰属: 同機序の解消を確認)
- Tests / Coverage Report(head+base+aggregate)/ Lint and complexity / Typecheck / Dist drift / Intent Mirror 系 / CI Success すべて pass

## 検証した面と未検証の面(verdict の書き分け)

- **検証済み**: installDoc 文言と discovery 定数の一致(t307 リグレッション3件+落ちる実証は CG 段実測)/ dist 7ハーネス・self-install 同期(drift ガード)/ 既存 plugin スイートの無退行(full CI)
- **未検証(明示)**: 実利用者による INSTALL.md 手順の end-to-end 再現(repo 外 scratch での手順追試)は本 intent では実施していない — ただし t299 系が `.amadeus-plugin-src` 配置→discovery→compose の同経路を機械的に実証しており、#1569 起票時の決定的再現(builder-u8)と対になる

## 判定

**READY**(条件なし)— 全ゲート green、リグレッションテスト実装済み・落ちる実証済み、CI 完走。残るのは PR #1579 のマージ承認(人間、no-AI-merge)と着地後の #1569 クローズのみ。
