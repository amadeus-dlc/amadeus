# Operation Phase Stage Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Operation Stage](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/operation.md)

## Phase Overview

Operation phase は、将来 phase 名として予約している。

現時点の Amadeus DLC では、Operation 成果物、Operation 用 skill、Operation gate、validator 条件を固定していない。

そのため、この文書は予約状態と非目標だけを記録する。

## Execution 判定基準

現時点の Operation phase には、実行対象の stage がない。

Stage Summary Table の `未定` は未確定を示す値であり、実行可能な `Execution` 値ではない。

将来 Operation 成果物契約を採用する場合は、`Execution`、`Condition`、Lead Skill、Outputs、gate、validator 条件を同じ変更で定義する。

その時点の `Execution` は、対象 stage を Operation の通常進行に含めるかを示す値として扱う。

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 未定 | 未定 | 未定 | Operation 成果物契約が採用された場合 | 未定 | 未定 |

## Reserved Scope

Operation phase で扱う可能性がある範囲は、deployment、monitoring、incident response、feedback、運用証拠である。

ただし、これらは現時点では Amadeus DLC の標準成果物ではない。

## Current Contract

Construction phase では、Operation 成果物を作らない。

`operation/` は将来 phase 名として予約する。

対応 skill が確定するまで、`operation/` を必須成果物配置や validator 必須対象に含めない。

## Non-Goals

この文書では、Operation stage の番号を定義しない。

この文書では、Operation 成果物のファイル名を定義しない。

この文書では、Operation gate の条件を定義しない。

この文書では、deployment、monitoring、incident response、feedback の手順を固定しない。

## Cross-References

- [Construction Phase Stages](construction.md)
- [ADR 0002: Intent Phase Directory Layout を採用する](../../adr/0002-intent-phase-directory-layout.md)
