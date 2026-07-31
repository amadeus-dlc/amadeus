# Build and Test Summary — 260730-open-bug-batch-3

上流入力(consumes 全数): 3 unit(fix-1752/fix-1773/fix-1772)の code-generation-plan.md / code-summary.md — 実行計画は instructions 5点、確定値は build-test-results.md に依拠する。

## 要約

open bug 3件(#1752/#1773/#1772)の修正バッチは、1 Issue = 1 Bolt = 1 PR の境界で3 PR(#1802/#1808/#1809)全てがスカッシュマージ着地し、最終断面(origin/main 75367ba67)で (a) 3バグのリグレッション 178 pass / 0 fail(宣言7ファイル全実行照合済み) (b) push CI 全ジョブ green (c) drift/型/lint/complexity/coverage patch 全ゲート成立を実測した。判定 **PASS**(未検証面の明示は results 参照)。

## 特記事項

- Comprehensive 相当の実行形: 各 Bolt worktree でのフル CI + 本線最終断面での焦点スイート再実行(cid:build-and-test:bt-20260730-1 の実行形を踏襲)。
- 既知 flake 2クラス(t258 ベンチマークタイムアウト・t-team-up-codex-resume.serial)は assertion 実文+単独再実行+交差ゼロで環境起因と帰属し、背景要因 #1811 は別 Issue 追跡。
- 性能・セキュリティの新規検査は比例選定で不生成(根拠は各 instructions に明記)。#1773 の blind 封鎖テスト(t373)が本バッチのセキュリティ検証正本。
