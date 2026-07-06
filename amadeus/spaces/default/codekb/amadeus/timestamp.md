# 解析記録：amadeus

- 解析時刻: 2026-07-05T12:25:00Z
- 対象コミット: 3049eadf（origin/main）
- 解析方式: focused manual re-scan（Maintainer 指示による全面更新。2026-07-03 スナップショットを置き換える）

## 更新履歴

- 2026-07-03T18:13:09Z: 初回解析（対象コミット 42f3caee）。
- 2026-07-05T12:00:00Z: 廃止機構（intents.md 索引、IndexGenerate.ts）の記述を部分補正（PR #495）。
- 2026-07-05T12:25:00Z: エンジン駆動化・skill 体制・退役機構を反映した全面再解析（PR #496）。
- 2026-07-05T23:25:37Z: 3049eadf..616d063e の差分駆動増分更新（Intent `260705-persist-cid-metamain`。詳細は reverse-engineering-timestamp.md。engineer1 の #428 側並行更新 503a7aa9 と内容統合済み）。
- 2026-07-06T00:25:00Z: 616d063e..2a0a784b の差分駆動増分更新（Intent `260706-docs-lang-guide`。PR #531 = #504/#507 のエンジン変更を反映: eval 28→29、cid marker 新形式、import.meta.main ガード。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T01:20:00Z: 2a0a784b..7829d99a の差分駆動増分更新（Intent `260706-readme-refresh`。PR #536 は docs-only のため codekb 9 docs への影響なし。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T01:53:29Z: 2a0a784b..33c40271 の差分駆動増分更新（Intent `260706-rename-lint-fixes`。PR #536/#539/#542 = docs 言語方針・Adaptive Workflows 2.2.0・parity-baseline 再生成を反映。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T04:04:37Z: 33c40271..c50a0fe5 の差分駆動増分更新（Intent `260706-full-rename`。PR #544/#545/#546/#549/#550 = no-stub-compat rule、audit-format 設計境界節、pr-gate-discipline.md 新設、README 刷新、rename 漏れ 2 件 + linter sensor 2 段検出。eval 数 29→31、sensors 行の新設を反映。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T05:44:48Z: c50a0fe5..9dd93f50 の差分駆動増分更新（Intent `260706-engine-consistency`。PR #553 = 全面 rename #526 を反映: 名前空間再定義 1 行と検出器記述。codekb 本文の path 表記は #553 自身が更新済み）。
- 2026-07-06T06:05:00Z: c50a0fe5..9dd93f50 の差分駆動増分更新（Intent `260706-docs-i18n`。PR #553 = 全面 rename。codekb は #553 内で反映済みのため、残存旧名 1 件（architecture.md の docs-only 宣言説明）の修正のみ。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T07:50:00Z: 9dd93f50..3366cd69 の差分駆動増分更新（Intent `260706-guide-intro`。PR #559 の #548 = validator RE produces の共有 codekb 直接解決を architecture.md へ追記。#561 / #563 は docs-only で影響なし。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T07:58:00Z: 9dd93f50..b452f4fb の差分駆動増分更新（Intent `260706-feature-diff`。PR #559/#561/#563/#565 = エンジン整合修正・lifecycle I/O 記法・docs i18n・harness/codex 新設。code-structure と component-inventory へ harness 層と Codex guard を追記。詳細は reverse-engineering-timestamp.md）。
