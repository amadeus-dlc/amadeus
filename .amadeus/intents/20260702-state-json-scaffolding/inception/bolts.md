# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | 雛形生成スクリプトと eval を実装する。 | U001 | [design.md](units/U001-state-scaffold-contract/design.md) | なし | [B001-scaffold-script-and-eval.md](bolts/B001-scaffold-script-and-eval.md) |
| B002 | phase skill の手順へ参照を追加し、promote で同期する。 | U001 | [design.md](units/U001-state-scaffold-contract/design.md) | B001 | [B002-procedure-reference-and-promotion.md](bolts/B002-procedure-reference-and-promotion.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | スクリプトの存在と契約が、手順からの参照の前提であるため。 |
| B002 | B001 | 手順の参照は、スクリプトの path と引数体系を参照するため。 |
