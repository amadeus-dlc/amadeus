# Domain Entities

## 目的

承認待ちキュー一覧契約で扱う概念を、実装と検証で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Approval Wait | 承認待ちの 1 件を表す。Intent、phase、ゲート（Ideation gate、Inception gate、Construction gate、Task Generation Gate（Bolt ID））、待ち理由を持つ。 | BL002, BL003, BL004, BL005 |
| DE002 | Gate Vocabulary Contract | 承認待ち判定が準拠するゲート語彙契約を表す。契約カタログの `gateResultByStatus` と validator の gate、status 語彙を定義元とする。 | BL002, BL003, BL004, BR001 |
| DE003 | Gate Queue Scan | 走査（`state.json` の収集）、判定（契約からの承認待ち導出）、整列（決定論的な並び順）、出力（Markdown 表と 0 件表示）の一連の処理を表す。 | BL001, BL005, BL006, BL007 |
| DE004 | Wait Reason | 「`<フィールドパス>` が `<値>`」の形式で根拠フィールドを示す決定論的な待ち理由表現を表す。 | BL005, BR003 |

## 関係

- DE003 Gate Queue Scan は、DE002 Gate Vocabulary Contract に従って DE001 Approval Wait を導出する。
- DE001 Approval Wait は、DE004 Wait Reason を待ち理由として持つ。
- DE003 Gate Queue Scan は、`state.json` を変更しない読み取り専用の処理である。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の運用手段（承認待ちの可視化）の追加である。 | 反映しない | [D003](../../../inception/decisions/D003-single-unit-exception.md) |

## 未確認事項

なし。
