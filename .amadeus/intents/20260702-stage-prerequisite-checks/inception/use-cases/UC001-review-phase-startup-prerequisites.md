# UC001 phase skill 起動時の前提を確認する

## ユースケース

phase skill 起動時に、Agent が skill 供給元と stage 前提を確認し、現在の処理を進めてよいか判断する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- 対象 Intent の成果物を読める。
- phase skill が `amadeus-decision-review` または Skill Contract を参照できる。
- stage0、stage1、stage2、stage0 採用判断の語彙を参照できる。

## 基本フロー

1. Agent は、対象 phase skill の source skill を確認する。
2. Agent は、対応する昇格先成果物を確認する。
3. Agent は、host environment で使える skill がどの stage に由来するか確認する。
4. Agent は、stage2 を stage0 として扱う場合に stage0 採用判断があるか確認する。
5. Agent は、確認結果を decision review の入力証拠として扱う。

## 代替フロー

| 条件 | 扱い |
|---|---|
| source skill はあるが昇格先成果物に反映されていない。 | 前提不成立として UC002 に渡す。 |
| 昇格先成果物はあるが host environment で使える証拠がない。 | 前提不成立として UC002 に渡す。 |
| stage2 を stage0 として扱う stage0 採用判断がない。 | 前提不成立として UC002 に渡す。 |

## 対応要求

- R001
- R002
- R003

## 未確認事項

- host environment の利用可否を確認する最小証拠は Construction で確定する。
