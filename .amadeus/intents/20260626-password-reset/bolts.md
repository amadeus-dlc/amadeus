# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | システムがパスワード再設定要求の流れを提供する | U001 | [design.md](units/U001-password-reset-request/design.md) | なし | [B001-password-reset-request-flow/bolt.md](bolts/B001-password-reset-request-flow/bolt.md) |
| B002 | システムが認証情報更新の流れを提供する | U002 | [design.md](units/U002-credential-update-with-reset-token/design.md) | B001 | [B002-credential-update-flow/bolt.md](bolts/B002-credential-update-flow/bolt.md) |

ボルトはインテント配下に置く。

ボルトは 1つのユニット、または依存関係で結び付いた少数のユニットを実装する。

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | パスワード再設定要求の入口であり、先行ボルトの成果を前提にしない。 |
| B002 | B001 | 認証情報更新は、B001 が定義する再設定トークン発行の成果を前提にする。 |
