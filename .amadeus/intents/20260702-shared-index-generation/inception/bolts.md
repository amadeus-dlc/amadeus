# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | 再生成スクリプトと検証を実装する。 | U001 | [design.md](units/U001-shared-index-generation-contract/design.md) | なし | [B001-regeneration-script-and-verification.md](bolts/B001-regeneration-script-and-verification.md) |
| B002 | validator の不整合検査と生成マーカー検査を追加する。 | U001 | [design.md](units/U001-shared-index-generation-contract/design.md) | B001 | [B002-validator-consistency-checks.md](bolts/B002-validator-consistency-checks.md) |
| B003 | writer skill の手順と steering テンプレートを更新し、promote で同期する。 | U001 | [design.md](units/U001-shared-index-generation-contract/design.md) | B001 | [B003-skill-procedures-and-templates.md](bolts/B003-skill-procedures-and-templates.md) |
| B004 | workspace と examples の migration を実施する。 | U001 | [design.md](units/U001-shared-index-generation-contract/design.md) | B001, B002, B003 | [B004-workspace-and-examples-migration.md](bolts/B004-workspace-and-examples-migration.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | 生成規則と見出し契約が、検査、手順、migration すべての前提であるため。 |
| B002 | B001 | 不整合検査は生成規則の再利用として実装するため。 |
| B003 | B001 | 手順が参照するスクリプトの path と引数体系が前提になるため。 |
| B004 | B001, B002, B003 | migration の完了確認は、生成、検査、手順のすべてが確定した状態での validator pass を根拠にするため。 |
