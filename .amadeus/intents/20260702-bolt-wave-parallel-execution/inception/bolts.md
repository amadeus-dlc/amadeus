# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | amadeus-construction へ wave 実行契約を定義し、promote で同期する。 | U001 | [design.md](units/U001-bolt-wave-execution-contract/design.md) | なし | [B001-wave-contract-definition.md](bolts/B001-wave-contract-definition.md) |
| B002 | 既存検証との整合を確認する（e2e mock 非破壊、skill-forge 確認）。 | U001 | [design.md](units/U001-bolt-wave-execution-contract/design.md) | B001 | [B002-verification-alignment.md](bolts/B002-verification-alignment.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | wave 契約の本文が、整合確認の前提であるため。 |
| B002 | B001 | 確認対象の契約本文が前提になるため。 |
