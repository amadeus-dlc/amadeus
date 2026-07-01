# Domain Entities

## 目的

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

この Unit で扱う追跡表要素を、Construction 成果物内の domain model として整理する。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Construction Trace Table | 完了済み Construction の実装証拠と検証証拠を Bolt と Task へ結び付ける。 | BR001, BR002 |
| DE002 | Task Generation Trace Table | Task Generation から Task までの対応を示す。 | BR003 |
| DE003 | Finalization Guidance | 追跡表の作成または補修手順を agent に伝える。 | POST001 |

## 関係

`Finalization Guidance` は `Construction Trace Table` の作成または補修を指示する。
`Task Generation Trace Table` は Task 生成の追跡を担当し、完了時の証拠追跡を代替しない。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 新しい共有境界はない。 | 更新しない | Unit Design Brief |
| なし | Context Map | 新しいコンテキスト依存はない。 | 更新しない | Unit Design Brief |

## 未確認事項

なし。
