# Domain Entities

## 目的

雛形生成契約で扱う概念を、実装と eval で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Phase Transition | phase 遷移の種別を表す。`intent-capture`、`inception-start`、`inception-complete`、`construction-start`、`functional-design`、`bolt-preparation`、`finalization` の 7 識別子を持つ。 | BL001, BL002, BL003, BL004 |
| DE002 | State Scaffold | 遷移種別ごとの `state.json` の生成、更新内容を表す。設定する項目の集合として定義される。 | BR002, BR003 |
| DE003 | Artifact Scan | 対象 phase 配下の実在ファイルの走査を表す。必須成果物配列と evidence の値の根拠になる。 | BR004 |
| DE004 | Contract Reference | 生成済み契約（`validator/generated/**`）からの状態語彙の参照を表す。 | BR005, BL006 |

## 関係

- DE001 Phase Transition は、DE002 State Scaffold を 1 つ持つ。
- DE002 State Scaffold は、必須成果物配列と evidence の値を DE003 Artifact Scan から得る。
- DE002 State Scaffold は、状態語彙を DE004 Contract Reference から得る。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の生成手段の追加である。 | 反映しない | [D002](../../../inception/decisions/D002-bc001-reference.md) |

## 未確認事項

なし。
