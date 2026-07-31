# Requirements Analysis 質問票 — 260731-perf-ci-separation

## 質問なし(0問様式)の宣言

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md

要件レベルの判断は intent-capture Q1〜Q4(ユーザー承認 2026-07-31T09:00:19Z)で確定済み。残る「perf テストの分類機構」は、RE 実測が確定した既存流儀 — tier はディレクトリが唯一の軸(tests/run-tests.ts:71 の Level 型、levelFiles :839 の readdirSync)であり e2e が既に `--ci` 外の先例 — から `tests/perf/` ディレクトリ tier として一意に導出されるため質問しない(cid:requirements-analysis:c5 既存流儀優先)。移動対象ファイルの最終目録は design の実測棚卸しで確定する(要件は選定基準のみ固定)。

## 裁定の記録

- 依拠裁定: intent-capture Q1=A(daily+dispatch)/ Q2=A(distribution-benchmark 移設)/ Q3=B(loud 可視化のみ)/ Q4=C(#1830 経路Aのみ)
- 分類機構の導出根拠: codekb code-structure.md の 260731-perf-ci-separation 節(run-tests.ts tier 模型・e2e 先例)— 執行クラス(既存流儀からの一意導出)につき選挙不要
- ユーザー承認: 2026-07-31T09:00:19Z(intent-capture 裁定の引用)
