# スコープ

## 対象境界

`対象` と `対象外` は、この Intent が扱う利用者価値、業務境界、外部境界を示す。
AI-DLC v2 の実行スコープではない。

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | 自己開発 cycle の stage 判定語彙 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 採用 |
| SC-IN-002 | stage2 を次回 stage0 として採用する判断条件 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-IN-003 | build workspace、host environment、target workspace、target artifacts の対応記録先 | [development.md](../../../development.md) | 採用 |
| SC-IN-004 | 後続 Intent が参照する記録先 | [20260701-self-development-first-cycle.md](../../../discoveries/20260701-self-development-first-cycle.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | skill 実装 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 対象外 |
| SC-OUT-002 | validator 実装 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 対象外 |
| SC-OUT-003 | example snapshot 再生成 | [Issue #233](https://github.com/amadeus-dlc/amadeus/issues/233) | 対象外 |
| SC-OUT-004 | Requirement、Use Case、Unit、Bolt、Task | [amadeus-ideation](../../../../skills/amadeus-ideation/SKILL.md) | 対象外 |

## 実行制御

`実行スコープ` は AI-DLC v2 の Scope に対応し、実行する stage の範囲を制御する。
Intent の `対象` とは別に扱う。

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | feature | 自己開発の共通記録単位を追加する一つの機能として扱えるため。 |
| 省略 stage | なし | stage 判定と workspace 対応記録は後続 Inception で要求と受け入れ条件へ落とす必要があるため。 |

## 成果物深度

成果物深度は、作成する成果物の粒度と説明量を制御する。

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 後続 Intent が参照する共通判断なので、対象、対象外、未確定事項、追跡を明示する必要があるため。 |

## 検証戦略

検証戦略は、検証量と検証方法を成果物深度から独立して制御する。

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | 成果物構造は validator で確認し、実装検証は後続 Construction まで進めないため。 |

## Inception への引き継ぎ

- stage0、stage1、stage2 の定義を、後続で Requirement と Acceptance に落とす。
- stage2 を次回 stage0 として採用する条件を、受け入れ条件として確認できる形にする。
- build workspace、host environment、target workspace、target artifacts の対応記録先を、traceability または decisions に固定する。
- `CONTEXT.md` へ stage 語彙を追加するかは、Inception の要求整理で確定する。
