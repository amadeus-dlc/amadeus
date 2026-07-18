# Intent Statement — test-pyramid-rebuild(Issue #684)

上流入力(consumes 全数): なし(ワークフロー起点 — 入力は Issue #684+コメント6件+ユーザー P0 指示 2026-07-17)

## Problem Statement(課題)

amadeus のテストスイート(unit 211 / integration 147 / e2e 68 / smoke 14 — 計440ファイル、2026-07-17 実測)は**テストスコープ(ディレクトリ層)では分類されているが、テストサイズ(実行時の動的性質=プロセス/ネットワーク/FS 使用)では設計されていない**。test_pyramid 分類器での実測は下記のとおりサイズ観点でアイスクリームコーン型(medium 偏重)を示す:

| tier | small | medium | large |
|---|---|---|---|
| unit | 48 | **162** | 1 |
| integration | 9 | 138 | 0 |
| e2e | 3 | 63 | 2 |
| smoke | 0 | 14 | 0 |

unit 層の 211件中 162件(77%)が medium(FS/spawn を使う)= サイズ観点の層違反疑い。t_wada 知見の核心「テストスコープでなくテストサイズで分類すると一貫した戦略になる」に照らし、この未分類が偽陽性(脆い/flaky テスト)・実行時間予算・重複の管理不能を生む。

## Target Customer(顧客)

内部 — amadeus フレームワーク開発チーム。テストの信頼性(短時間で信頼できる結果に到達するバランス)を維持する主体。

## Success Metrics(成功指標)

- 440+ファイルのサイズ分類が**計測から導出**され台帳化(test_pyramid コレクタ活用・ハードコード禁止)
- 各層の責務(unit=純関数/ドメイン型、integration=ツール・フック・FS 境界、e2e=ハーネス駆動)+サイズ基準+比率目標+実行時間予算を文書化
- サイズ違反(unit なのに spawn する等)の移設/是正を Issue 分割で計画(単一 Bolt に押し込まない)
- 既存スイートのグリーン維持(team.md)+#683(Codecov ゲート)との層別カバレッジ整合

## Initiative Trigger(トリガー)

ユーザー P0 指示(2026-07-17、#684 の再優先)— bugs-only 運用下の明示例外。

## Initial Scope Signal(初期スコープ)

`amadeus`(18ステージ)。大型につき units-generation で分割判断(実測・設計・再編計画の各面を独立 Unit へ）。設計判断(比率目標・層境界の具体値・移設対象の選定)は選挙で確定。
