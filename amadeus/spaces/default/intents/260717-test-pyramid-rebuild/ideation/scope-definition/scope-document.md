# Scope Document — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## In Scope

1. 全テスト(unit 211/integration 147/e2e 68/smoke 14 = 440)のサイズ分類台帳 — classifyTestSize による計測導出(fan-out スイープ、ハードコード禁止)
2. 層責務の定義(unit=純関数/ドメイン型、integration=ツール・フック・FS 境界、e2e=ハーネス駆動)+サイズ基準+比率目標+実行時間予算の設計(実測前提・値は選挙)
3. サイズ違反(unit の medium 162件等)の移設是正を Issue 分割で計画
4. #683(Codecov ゲート)との層別カバレッジ整合の計画

## Out of Scope

- 実移設(テストの書き換え・移動)— 別 intent 候補(グリーン退行リスク・単一 Bolt 肥大回避、C-2/C-6)
- ランナー(run-tests.sh)の実装変更 — 再編は計画まで
- 比率・予算のハードコード(検証劇場 Forbidden)
- 新分類器の実装(既存 classifyTestSize を正、C-3)

## units 分割(units-generation で具体化)

大型のため複数 Unit へ分割(leader 明示)。候補: U1 分類台帳・実測 / U2 層設計・比率・予算 / U3 再編計画・Issue 分割。fan-out(rubric 1本化・effort low・境界 high)で分類を機械実行。

## 深さ・テスト水準

- ワークフロースコープ: amadeus(18 stages)
- 本 intent の成果物は文書(台帳・設計・計画)中心。コード変更は分類台帳生成スクリプト等の最小限に留め、既存グリーン維持
