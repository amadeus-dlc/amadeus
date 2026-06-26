# ドメインモデル

## 範囲

この文書は、`20260626-password-reset` インテントで BC001 認証アクセスに属する DDD モジュール単位のドメインモデル一覧を扱う。

全体のモデル一覧は、[../../../../../domain/bounded-contexts/BC001-authentication-access/models.md](../../../../../domain/bounded-contexts/BC001-authentication-access/models.md) を参照する。

## 一覧

| モジュール | 役割 | モデル |
|---|---|---|
| account | パスワード再設定で使うアカウント、認証情報、再設定トークンの概念関係、ライフサイクル、集約候補を扱う。 | [model.md](models/account/model.md) |
