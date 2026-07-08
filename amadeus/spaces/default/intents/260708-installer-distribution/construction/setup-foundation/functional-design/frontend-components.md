# Frontend Components — setup-foundation

> ステージ: functional-design (3.1) / Unit: setup-foundation / 作成: 2026-07-08

## 適用外の宣言

本 Unit(setup-foundation: resolver / fetcher / manifest+パッケージ骨格)は **UI サーフェスを持たない**。フロントエンドコンポーネント設計は CONDITIONAL 成果物(stage frontmatter: 「only if unit includes frontend/UI」)であり、本 Unit には該当しない。

## 根拠と代替カバレッジ

- 対話サーフェス(CLI ウィザード・プロンプト)は **U2 install-flow の cli モジュール**が所有する(application-design/components.md の境界定義)。U2 の functional-design で扱う
- 本ファイルはエンジンのユニット被覆判定(produces 全存在)を満たすための**根拠付き適用外宣言**であり、プレースホルダースタブではない(construction フェーズルールの「根拠なき TODO 禁止」に対する明示的根拠)
