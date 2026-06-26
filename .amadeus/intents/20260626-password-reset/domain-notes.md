# ドメインメモ

## 未確定事項

- 再設定トークンの失敗応答を、期限切れ、使用済み、不正のどこまで同一にするか。
- パスワード再設定要求時の通知手段を、このインテントの範囲に含めるか。

## 課題

- `traceability.md` のドメインモデル追跡では、`境界` と `概念` が自然言語名で記録されている。
  - 現状: `境界づけられたコンテキスト`、`事前条件`、`不変条件`、`事後条件` は ID で検査できる。
  - 現状: `境界` と `概念` は `domain/bounded-contexts.md` や `model.md` の本文に出る名前であり、Execution Validator では機械的な ID 検査の対象外である。
  - 問題: `境界` と `概念` の名称変更、重複、削除を、追跡表から機械的に検出しにくい。
  - 影響: `domain/bounded-contexts.md`、`domain/bounded-contexts/<bounded-context-id>/models/<ddd-module-id>/model.md`、`traceability.md`、Execution Validator の検査規則。
  - 次の判断: `境界` と `概念` に識別子を付与するか、自然言語名を維持したまま定義元内の見出しや表へ紐づけるかを決める。
  - 保留理由: ただちに ID 化するとドメインモデルの記述形式、追跡表の契約、validator の検査意味を同時に変えるため、このインテントでは構造変更せず課題として扱う。

## ドメインモデルへの昇格候補

- なし。

## 反映済み

- 再設定トークンはアカウントに紐づく単回利用の概念である。
  - 反映先: [domain/bounded-contexts/BC001-authentication-access/models/account/model.md](domain/bounded-contexts/BC001-authentication-access/models/account/model.md), [domain/bounded-contexts/BC001-authentication-access/contracts.md](domain/bounded-contexts/BC001-authentication-access/contracts.md)
