# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | 承認待ちキュー一覧スクリプトと検証を実装する。 | U001 | [design.md](units/U001-approval-queue-listing-contract/design.md) | なし | [B001-listing-script-and-verification.md](bolts/B001-listing-script-and-verification.md) |
| B002 | 利用者向け文書へ実行手順を記載し、promote で同期する。 | U001 | [design.md](units/U001-approval-queue-listing-contract/design.md) | B001 | [B002-skill-procedure-and-promotion.md](bolts/B002-skill-procedure-and-promotion.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 判定の導出規約と出力契約が、手順記載の前提であるため。 |
| B002 | B001 | 手順が参照するスクリプトの名前と CLI 契約が前提になるため。 |
