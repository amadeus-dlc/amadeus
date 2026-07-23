# Business Rules — U3 team-launcher-promotion

> 上流入力(consumes 全数): requirements(FR-3/4/8)、components(C4/C5)、component-methods(C4/C5)、unit-of-work(U3)、unit-of-work-story-map、services(外部サービス境界)

## ルール一覧

| ID | ルール | 検証 |
|---|---|---|
| BR-1 | prerequisite 検査は main 処理・herdr 呼び出しより前に実行(部分起動後の失敗を作らない — フェイルファスト) | fake PATH での integration テスト |
| BR-2 | 不在エラーは「ツール名+公式入手先+docs 参照+exit 1」の4要素必須(FR-3c 契約) | エラー文言 assert+exit code |
| BR-3 | OS 非対応(Darwin/Linux 以外)は herdr 検査より先に判定し loud 停止(FR-3d) | uname スタブの unit 駆動 |
| BR-4 | 既存 env override 契約は全面不変 — 検査自体も AGMSG_ROOT 等の override を尊重して探索する(NFR-2/FR-8a) | 既存テスト green+override 経路テスト |
| BR-5 | doctor advisory は exit code 不影響・表示のみ(FR-4a)。検出関数は exported seam で in-process 検証(NFR-3) | doctor exit 不変 assert+lcov DA |
| BR-6 | パス導出は `$(dirname "$0")` 相対のみ — `$REPO/scripts/` 形の残存 0 件(FR-3b) | 実装時 grep 0 件+配布コピーからの起動テスト |
| BR-7 | prerequisite 集合(herdr/agmsg)と案内文言は canonical 1定義 — 対象ツール集合と入手先 URL は docs の prerequisite 節を正とし、bash/doctor の両実装が参照コメントで指す。**加えて code-generation 段で両定義の集合一致を assert する軽量整合テストを追加する**(コメント参照のみのレビュー依存にしない — 機械ガード化) | 整合テスト+docs ガード |
| BR-8 | agmsg 本体は配布しない(FR-8c、T-1 / Out of scope)— U3 側の実装アクションなし。統合面の fake-binary 検証は U4 が担う(境界の明示) | スコープレビュー(実装 diff に agmsg コード混入 0) |

## 検証の割付

BR-3/BR-5(判定ロジック)は unit 層(純関数/uname 注入)、BR-1/BR-2/BR-4/BR-6 は integration 層(fake binary+temp PATH)、BR-7 はレビュー+docs ガード。E2E 面の総合検証は U4 が担う。
