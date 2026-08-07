# Build & Test Results — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md`(検証設計)と `code-summary.md`(検証実績)— 実行対象は `unit-test-instructions.md` の trace 表から機械転記。実行日: 2026-08-07、測定 ref = branch `260807-failclosed-recovery` HEAD `0af9b25c6`(source 面は `git diff origin/main --stat` 0行 = origin/main と byte 同一)。

## ビルド

| 項目 | 結果 | 出典コマンド |
|---|---|---|
| セルフインストール再生成 | success(promote-self 完了) | `bun run build`(exit 0) |
| 型検査 | success | `bun run typecheck`(exit 0) |
| lint | success(errors 0 / warnings 443 = 既存水準) | `bun run lint`(exit 0) |

## テスト実行

focused 10 ファイル(実在確認: DECLARED=10 / EXISTING=10、配列展開)。runner 出力: `Ran 118 tests across 10 files`。

| 結果 | 件数 |
|---|---|
| pass | 117 |
| fail | 1 |
| expect() calls | 565 |

**fail の帰属(切り分け実測)**: fail は `t458 full grant下でpending advisoryが無人裁定されreceiptが記録される`(t458:112-117 の `applyProductionAutonomyMode` toMatchObject)。
- t458 単独 = 8/8 pass(2回)
- 最小決定的再現 = `t480-declare-units-done.integration.test.ts` → `t458` の2ファイル(2回連続 fail)
- source 面は origin/main と byte 同一(`git diff origin/main --stat` 0行)のため未コミット変更起因ではない
- 帰属: intent Bolt 3(PR #2393)で追加した t480 integration のプロセスグローバル状態未復元 → **Issue #2403(bug / P2 / S3-MAJOR)として起票済み**。CI 現行順序では未発現(latent)。本 intent の3 unit の機能面テスト(t413/t427×3/t466/t470/t480/t367)はすべて green。

## CI 統合証跡(正規判定)

3 Bolt の PR はいずれも必須 CI 全 green でマージ着地済み(Project/Patch Coverage Gate・complexity・再現性検査・source-only 検査・no-silent-drop gate を含むブロッキング集合): #2387 / #2389(Bolt 1)、#2392(Bolt 2)、#2393(Bolt 3)。`cid:build-and-test:bt-20260730-1` の brownfield バグバッチ執行形に従い、フルスイートの再実行は各 PR の CI 実績を正とし、ローカルは focused 再実行で退行なしを確認した。

## 検証した面と未検証の面(verdict 書き分け)

- 検証済み: 3 unit の FR/AC 対応テスト(green)・型/lint・実 store 回復(#2330)・宣言機構の実地動作(#2358 — 本セッションの engine gate 発行)。
- 未検証(AC 外・申し送り): #2403 の恒久修正(別 Issue)/ #2397 の coverage 回転フレーク(別 Issue)/ pr-convergence のマージ済み PR 観測(#2401、別 Issue)。いずれも FR-1〜3 / NFR-1〜5 の受け入れ基準の外(`cid:build-and-test:c2-unconditional-ready-boundary`)。
