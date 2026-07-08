# Monitoring Design — publish-readiness

> ステージ: infrastructure-design (3.4) / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(手順書6章: 公開後検証)

## 適用外の宣言(根拠付き)

常設モニタリングは持たない。公開直後の健全性は手順書6章の公開後検証(`npx @amadeus-dlc/setup@<version> --help` 実行+npm ページのメタデータ目視)が担う一回性のチェックであり、継続監視は導入しない(scope: observability-setup SKIP と整合)。
