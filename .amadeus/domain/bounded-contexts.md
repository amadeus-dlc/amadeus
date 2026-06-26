# 境界づけられたコンテキスト

## 一覧

| 識別子 | 名前 | サブドメイン | 役割 | モデル | 契約 |
|---|---|---|---|---|---|
| BC001 | 認証アクセス | SD001 | 利用者が本人であることを確認し、アカウントに紐づく認証情報と再設定トークンの整合性を守る。 | [models.md](bounded-contexts/BC001-authentication-access/models.md) | [contracts.md](bounded-contexts/BC001-authentication-access/contracts.md) |

## インテント別参照

| インテント | サブドメイン | コンテキスト | 境界 | モデル | 契約 |
|---|---|---|---|---|---|
| 20260626-password-reset | [subdomains.md](../intents/20260626-password-reset/domain/subdomains.md) | [bounded-contexts.md](../intents/20260626-password-reset/domain/bounded-contexts.md) | BC001 | [models.md](../intents/20260626-password-reset/domain/bounded-contexts/BC001-authentication-access/models.md) | [contracts.md](../intents/20260626-password-reset/domain/bounded-contexts/BC001-authentication-access/contracts.md) |
