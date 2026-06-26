# ドメインメモ

## 未確定事項

- 再設定トークンの失敗応答を、期限切れ、使用済み、不正のどこまで同一にするか。
- パスワード再設定要求時の通知手段を、このインテントの範囲に含めるか。

## ドメインモデルへの昇格候補

- なし。

## 反映済み

- 再設定トークンはアカウントに紐づく単回利用の概念である。
  - 反映先: [domain/bounded-contexts/BC001-authentication-access/model.md](domain/bounded-contexts/BC001-authentication-access/model.md), [domain/bounded-contexts/BC001-authentication-access/contracts.md](domain/bounded-contexts/BC001-authentication-access/contracts.md)
