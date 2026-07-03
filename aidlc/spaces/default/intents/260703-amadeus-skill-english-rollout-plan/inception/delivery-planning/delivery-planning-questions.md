# Questions：Delivery Planning

## 回答一覧

| ID | 質問 | 推奨回答 | 回答 |
|---|---|---|---|
| Q001 | Bolt の束ね方、最初の Bolt、順序付けの優先をどうしますか。 | Unit 1 個ずつ、U001 を walking skeleton、依存先行。#395、#400、#401、#402 の完了証拠をそのまま Bolt に対応させ、依存 DAG と親 Issue の追跡を崩さない。 | 推奨回答を採用する。 |

## Q001 の判断

Bolt は Unit 1 個ずつ束ねる。

B001 は U001 を扱い、walking skeleton とする。

順序付けは依存先行とする。
