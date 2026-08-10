# Unit Test Instructions

## Scope

U1 は failure transition、U2 は consume fan-out を対象とし、正常系と abort・placeholder などの境界系を検証する。

## Commands and expectations

対象テストを `bun test <test-file>` で実行し、全 assertion が成功することを確認する。U1/U2 の既存テストを変更契約の回帰証明として扱う。

## Data

テスト内 fixture のみを使い、外部サービスや手動セットアップに依存しない。
