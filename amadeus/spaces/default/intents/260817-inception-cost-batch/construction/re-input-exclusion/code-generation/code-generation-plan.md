# Code Generation Plan — Unit re-input-exclusion(Bolt 2、#2415)

上流入力: `unit-of-work.md`(U2 定義・規模枠)、`unit-of-work-story-map.md`(U2 実装順 6 slice)、`requirements.md`(FR-EXC-1〜6 / FR-MEAS-2)、application-design(`decisions.md` ADR-2/ADR-3、`component-methods.md` C7、`components.md` C5-U2面/C7)。

## 実装計画(dispatch 時に確定)

- **実行形態**: swarm Batch 2(cap 1)、builder subagent を bolt worktree `bolt-re-input-exclusion`(base = `bolt-issue-evidence-upstream` @ ceca3f2f4 — U2→U1 内容依存+共有ファイル直列化のためスタック)へ dispatch。#3190 着地後に origin/main へ rebase して PR 化
- **TDD 順序**: story-map の 6 slice(FR-EXC-5 → 1/2 → 3 → 4 → 6 → MEAS-2)。契約 markdown 変更も drift 検査テストを先に赤で置く Red 先行
- **所有ファイル**: 契約 `reverse-engineering.md` の U2 面(Step 2 除外クラス宣言)、`amadeus-lib.ts`(`RE_SCAN_EXCLUDED_PATHSPECS` 定数)、t2415 系テスト、対訳 docs、coverage registry
- **demo(即時適用)**: 本 intent の RE 区間(89053172e..23d4ae767)への除外適用と縮小率・帰属検査の初回実測を builder 報告に含める
- **禁止**: push・PR 作成・engine/state ツール、U1 面(consumes/Focus 導出)への接触

## 実行中の裁量確定(設計が実装時実測へ委譲した点 — 逸脱ではない)

- `component-methods.md` C7 の但し書き「逐語は実装時に git 実測で確定」に従い、5クラス一律 `:(exclude,glob)` 形へ統一(metrics の素形 `:(exclude)metrics/**` 混在案を不採用)。根拠: 空間スコープ4クラスの素形は 0 件無音マッチの実測、形式統一による可読性。fixture+実履歴の両方で動作を実測済み
