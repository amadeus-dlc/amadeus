# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | `amadeus-discovery` の `dry-run` mode 契約を整える。 | U001 | [design.md](units/U001-discovery-dry-run-contract/design.md) | なし | [B001-discovery-dry-run-mode-contract.md](bolts/B001-discovery-dry-run-mode-contract.md) |
| B002 | `dry-run` 契約を昇格先成果物と text contract で検証できるようにする。 | U002 | [design.md](units/U002-dry-run-sync-verification/design.md) | B001 | [B002-dry-run-sync-verification.md](bolts/B002-dry-run-sync-verification.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | `dry-run` の source skill 契約が最初の変更単位になるため。 |
| B002 | B001 | 同期検証は source skill の契約が整ってから扱うため。 |
