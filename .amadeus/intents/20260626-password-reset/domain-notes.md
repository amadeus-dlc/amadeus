# ドメインメモ

## 未確定事項

- 再設定トークンの失敗応答を、期限切れ、使用済み、不正のどこまで同一にするか。
- パスワード再設定要求時の通知手段を、このインテントの範囲に含めるか。

## 課題

- なし。

## ドメインモデルへの昇格候補

- なし。

## 反映済み

- 再設定トークンはアカウントに紐づく単回利用の概念である。
  - 反映先: [domain/bounded-contexts/BC001-authentication-access/models/DM001-account/model.md](domain/bounded-contexts/BC001-authentication-access/models/DM001-account/model.md), [domain/bounded-contexts/BC001-authentication-access/contracts.md](domain/bounded-contexts/BC001-authentication-access/contracts.md)
- `traceability.md` のドメインモデル追跡では、`概念` の自然言語参照をやめ、`集約`、`エンティティ`、`値オブジェクト` を `BC001/DM001/<DDD要素ID>` で参照する形へ移行した。
  - 反映先: [traceability.md](traceability.md), [domain/bounded-contexts/BC001-authentication-access/models/DM001-account/model.md](domain/bounded-contexts/BC001-authentication-access/models/DM001-account/model.md)
- `境界` は ID 化せず、`domain/bounded-contexts.md` の `外部境界` 表にある自然言語名として追跡する形へ移行した。
  - 反映先: [domain/bounded-contexts.md](domain/bounded-contexts.md), [traceability.md](traceability.md)
