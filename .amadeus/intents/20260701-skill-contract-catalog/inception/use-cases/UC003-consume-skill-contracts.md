# UC003 Skill Contract の参照

## 概要

validator、evaluator、decision review、learning review が Skill Contract を入力として参照する。

## アクター

| 種別 | 名前 | 役割 |
|---|---|---|
| 主 | Validator | Skill Contract 生成物の構造と参照入口を検出する。 |
| 副 | Evaluator | Skill Contract を品質評価の入力候補として参照する。 |
| 副 | Agent | #257 と #259 の review で契約項目を入力にする。 |

## 事前条件

- UC002 が完了している。
- Skill Contract 生成物が最新である。

## 基本フロー

1. Validator は生成された `skill-contracts.ts` を参照する。
2. Evaluator は Skill Contract を評価入力として扱える入口を確認する。
3. Agent は decision review で、判断に必要な契約条件を Skill Contract から参照する。
4. Agent は learning review で、feedback 条件と学習候補を Skill Contract から参照する。

## 事後条件

- consumer が `SKILL.md` の自然文だけに依存せず Skill Contract を参照できる。
- validator の `passed` は内容承認ではなく、構造検出として扱われる。

## 例外

| 条件 | 対応 |
|---|---|
| 契約内容の品質評価が必要である。 | evaluator または後続 Intent へ委譲する。 |
| decision review または learning review に不足項目がある。 | Skill Contract の後続拡張候補として記録する。 |

## 対応要求

- R005

## 未確認事項

- なし。
