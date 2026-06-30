# Discovery Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Ideation Stage](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/ideation.md)

## Positioning

Discovery は、Amadeus DLC の top-level phase ではない。

Discovery は、Ideation で Intent Record を作る前に、入力テーマの課題粒度、既存 Intent との関係、Intent 化方針を整理する任意の補助分析である。

`amadeus-discovery` は、課題サイズが曖昧、大きい、または既存 Intent との関係が不明な場合に使う公開入口である。

## Responsibility

`amadeus-discovery` は、入力テーマをそのまま Intent Record 化しない。

Discovery Brief を作り、次に使う入口を判断できる状態にする。
Requirement、Use Case、Unit、Bolt、Task、実装方針は作らない。
`amadeus-ideation` も自動実行しない。

## Execution 判定基準

`Execution` は、対象 stage を Discovery の通常進行に含めるかを示す。

実行可否そのものは `Condition` と入力テーマ、既存 Discovery、既存 Intent の状態で判定する。

`CONDITIONAL` は、`Condition` が真の場合だけ実行する stage である。

`CONDITIONAL` の stage を実行しない場合は、後続 stage がその出力を必須入力にしてはならず、`state.json` や一覧成果物にも作成済みとして記録しない。

既存 Discovery の再開や補修では、新規 Discovery として重複作成せず、既存の Discovery Brief と `state.json` を点検または補修して充足する。

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| D.1 | Discovery Brief Preparation | CONDITIONAL | 入力テーマが曖昧、大きい、または既存 Intent との関係が不明な場合 | `amadeus-discovery` | `discoveries.md`、`discoveries/<discovery-id>.md`、`discoveries/<discovery-id>/state.json`、任意の `grillings/**` |

## Stage D.1: Discovery Brief Preparation

### Metadata

| Property | Value |
|---|---|
| Stage | D.1 |
| Phase | なし |
| Execution | CONDITIONAL |
| Condition | 入力テーマが曖昧、大きい、または既存 Intent との関係が不明な場合 |
| Lead Skill | `amadeus-discovery` |
| Mode | public |

### Purpose

Discovery Brief Preparation は、Intent 作成前の入力テーマを整理し、Intent 化するかどうか、または複数 Intent に分けるかどうかを判断できる状態にする。

Discovery が `passed` になっても、Intent Record は自動作成しない。
Intent Record が必要な場合は、`amadeus-ideation` を使う。

### Inputs

- steering layer
- 入力テーマ
- 既存 Discovery
- 既存 Intent
- 課題、成功状態、除外範囲、依存関係に関する既知情報

### Outputs

| Artifact | Description |
|---|---|
| `.amadeus/discoveries.md` | Discovery 一覧 |
| `.amadeus/discoveries/<discovery-id>.md` | Discovery Brief |
| `.amadeus/discoveries/<discovery-id>/state.json` | Discovery の状態、判断、gate |
| `.amadeus/discoveries/<discovery-id>/grillings.md` | 記録対象の質問と回答の索引 |
| `.amadeus/discoveries/<discovery-id>/grillings/Gxxx-*.md` | 記録対象の質問と回答 |

## Notes

AI-DLC v2 の 04-stages には、Amadeus DLC の Discovery と一対一に対応する stage はない。
Amadeus DLC では、cc-sdd の kiro-discovery を参考にしつつ、Ideation 前の任意補助分析として Discovery を定義する。

Discovery の結果は、Ideation の Intent Capture & Framing で参照できる。

## Cross-References

- [Steering Layer Reference](steering.md)
- [Ideation Phase Stages](ideation.md)
- [ADR 0002: Intent Phase Directory Layout を採用する](../../adr/0002-intent-phase-directory-layout.md)
