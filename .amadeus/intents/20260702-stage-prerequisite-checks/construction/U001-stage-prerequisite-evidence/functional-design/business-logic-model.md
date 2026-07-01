# Business Logic Model

## 目的

phase skill 起動時に、skill 供給元と実行環境の stage 前提を decision review の入力証拠として扱えるようにする。

## 対象 Unit

U001 stage prerequisite evidence。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | phase skill 起動時に、source skill、昇格先成果物、host environment での利用可否を分けて収集する。 | phase skill 起動入力、作業ツリー、Skill Contract | Skill Supply Evidence | R001, UC001 |
| BL002 | stage0、stage1、stage2、stage0 採用判断を確認し、stage2 を stage0 として扱えるか判定する。 | Skill Supply Evidence、steering layer、stage 方針 | Stage Prerequisite Evidence | R002, UC001 |
| BL003 | stage 前提確認を decision review の判断ノードとして扱う。 | Stage Prerequisite Evidence、既存成果物 | Decision Node Evaluation | R003, UC001 |
| BL004 | Skill Contract に、stage 前提確認を事前条件または入力証拠として記録する。 | Skill Contract catalog、Decision Node Evaluation | Skill Contract Update | R003, UC001 |
| BL005 | Ideation、Inception、Construction の phase skill 起動時説明から stage 前提確認を参照できるようにする。 | phase skill 文書、Decision Review | Phase Skill Startup Guidance | R003, UC001 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| source skill | `skills/amadeus-*` にある作業中の skill source。 | R001 |
| 昇格先成果物 | `.agents/skills/amadeus-*` にある host environment 向け成果物。 | R001 |
| host environment | 昇格済み skill または生成された skill が動作する環境。 | R001 |
| stage 方針 | stage0、stage1、stage2、stage0 採用判断の定義。 | R002 |
| Skill Contract | skill の事前条件、不変条件、事後条件、境界、feedback 条件。 | R003 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Skill Supply Evidence | source skill、昇格先成果物、host environment の確認結果。 | decision review |
| Stage Prerequisite Evidence | stage0、stage1、stage2、stage0 採用判断の確認結果。 | decision review、Skill Contract |
| Decision Node Evaluation | stage 前提確認を含む判断ノードの評価結果。 | phase skill |
| Phase Skill Startup Guidance | phase skill 起動時に確認する説明。 | Ideation、Inception、Construction |

## 未確認事項

なし。
