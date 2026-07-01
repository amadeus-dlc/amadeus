# UC002 Skill Contract 生成と検査

## 概要

Agent または CI が Skill Contract 生成物を作成し、catalog とのずれを検出する。

## アクター

| 種別 | 名前 | 役割 |
|---|---|---|
| 主 | Agent | `contracts:generate` を実行し、生成物を更新する。 |
| 副 | CI | `contracts:check` と eval でずれを検出する。 |

## 事前条件

- UC001 が完了している。
- Skill Contract catalog が公開されている。

## 基本フロー

1. Agent は `contracts:generate` で Skill Contract 生成物を作成する。
2. Agent は JSON、Markdown、validator 用 TypeScript の生成先を確認する。
3. CI は `contracts:check` で生成物の欠落と差分を検出する。
4. CI は eval で生成対象追跡と直接編集検出を確認する。

## 事後条件

- Skill Contract 生成物が catalog から導出されている。
- 生成物のずれが検出可能である。

## 例外

| 条件 | 対応 |
|---|---|
| 生成物が手編集されている。 | `contracts:check` を失敗させ、catalog 更新または再生成を求める。 |
| 配布先の片方だけが更新されている。 | 生成対象を補正し、`skills/**` と `.agents/skills/**` の必要な出力をそろえる。 |

## 対応要求

- R003
- R004

## 未確認事項

- なし。
