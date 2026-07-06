# Stakeholder Map — Presence Evidence（260705-presence-evidence）

## 主要ステークホルダーと関心事

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| Maintainer（j5ik2o） | 契約級判断（presence 意味論）の個別承認、merge | ガード強度と運用コストの均衡。#497 確定判断 8 との整合 |
| エンジン開発者（後続） | verifyDocsOnlyEvidence の保守 | 設計境界の明文化。検査の意味論が audit-format 等から追えること |
| 並行 Intent（engineer1 #428、engineer3 #504+#507） | amadeus-state.ts / tools の変更元 | ファイル単位の接触確認と順序調整（Construction 着手前のピア連絡 = ディスパッチ指示 5） |
| docs 系 Intent の実行者 | declare-docs-only の利用者 | 宣言手順が過剰に重くならないこと（環境差を含む） |

## 意思決定者と影響者

- **意思決定者**: Maintainer。実施候補 3 案の採否は requirements または design の gate で個別確認（auto 例外）。
- **影響者**: 並行 Intent 2 件（接触面 = amadeus-state.ts、tools 群）。

## コミュニケーション要件

- 4 イベント報告（gate 到達 / PR 作成 / ブロック / 完了）。候補採否 gate は個別確認を明示して依頼する。
- Construction 着手前に engineer1 / engineer3 へ接触面のピア連絡を行う。
