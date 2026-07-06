# Code Generation Plan — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent の「コード生成」は docs/amadeus/lifecycle/ の 6 文書の執筆・補正である（BR-7）。

## 手順（Bolt 直列）

| # | 手順 | Bolt | 状態 |
|---|---|---|---|
| 1 | overview.md へ「ステージ契約の I/O 記法」節を新設（規則 1〜6、qualifier はステージ名ベースを正とする） | B001 | 完了（承認 2026-07-06T06:34:36Z） |
| 2 | overview.md の GD009 残存を補正（計画 4 箇所 + 追加検出 2 箇所） | B001 | 完了（同上） |
| 3 | 22 ステージの frontmatter（consumes + 供給元 execution）を機械抽出し実測・補正記録へ保存 | B002 | 完了（承認 2026-07-06T06:40:35Z） |
| 4 | phase 別 3 文書の Inputs 表を記法へ統一・補正（GD009 置換 6、表記統一 7、qualifier 付与 2、根拠なし削除 1、自己矛盾補正 = Stage 1.1） | B002 | 完了（同上） |
| 5 | Phase Overview へ共通入力段落を 3 文書に追記 | B002 | 完了（同上） |
| 6 | scopes.md / state.md へ縮退形 Inputs 節を適用し、判断理由を記録。scopes.md の GD009 残存を補正 | B003 | 完了（gate 承認待ち） |
| 7 | §12a review（architecture-reviewer、最大 2 反復） | stage | 実施中 |
| 8 | validator + test:all の実行と記録 | build-and-test | pending |

## 検証方法

- 各補正の実測根拠は [measurement-correction-log.md](measurement-correction-log.md)（実測・補正記録 = FR-2.3 / FR-4.2 の単一成果物）を参照。
- 標準検証は build-and-test で `npm run test:all` と validator（Intent 指定）を実行し記録する（FR-4.1）。
