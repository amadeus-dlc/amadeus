# コンポーネント一覧：amadeus

## 一覧

| コンポーネント | 場所 | 責務 |
|---|---|---|
| 単一入口 `amadeus` | `skills/amadeus/`、`.agents/skills/amadeus/` | Intake、Initialization、stage routing、phase 境界、Bolt 実行。 |
| Ideation stage skill | `skills/amadeus-ideation-*/`、`.agents/skills/amadeus-ideation-*/` | Ideation の stage 成果物を作る。 |
| Inception stage skill | `skills/amadeus-inception-*/`、`.agents/skills/amadeus-inception-*/` | Inception の stage 成果物を作る。 |
| Construction stage skill | `skills/amadeus-construction-*/`、`.agents/skills/amadeus-construction-*/` | Construction の stage 成果物と実装支援を扱う。 |
| steering skill | `skills/amadeus-steering/`、`.agents/skills/amadeus-steering/` | Space の memory、knowledge、intents 索引を整える。 |
| event-storming skill | `skills/amadeus-event-storming/`、`.agents/skills/amadeus-event-storming/` | Event Storming 成果物を扱う。 |
| domain 系 skill | `skills/amadeus-domain-*`、`.agents/skills/amadeus-domain-*` | Glossary、Domain Map、Context Map、Intent 固有のモデル論点を扱う。 |
| grilling skill | `skills/amadeus-grilling/`、`.agents/skills/amadeus-grilling/` | 一問ずつの確認プロトコルを扱う。 |
| validator | `skills/amadeus-validator/`、`.agents/skills/amadeus-validator/` | 配布先で実行できる構造検証（AI-DLC v2 準拠検証を含む）を提供する。 |
| skill contract | `amadeus-contracts/`、`dev-scripts/amadeus-contracts.ts` | skill の境界、条件、委譲関係の生成元。 |
| promote-skill | `dev-scripts/promote-skill.ts` | source skill から昇格先 skill への反映を行う。 |
| examples pipeline | `dev-scripts/generate-amadeus-examples.ts`、`dev-scripts/validate-amadeus-examples.ts`、`dev-scripts/examples-contract.ts` | examples の生成、検証、不変条件を扱う。 |
| eval 群 | `dev-scripts/evals/` | validator、templates、contracts、e2e、migration の検査を扱う。 |
| lints | `lints/` | public type file と TypeScript complexity を検査する。 |

## Issue #399 に関係するコンポーネント

Issue #399 は `skills/amadeus*/` と `.agents/skills/amadeus*/` の英語化計画を扱い、CLOSED（Intent `260703-amadeus-skill-english-rollout-plan` は Status: Completed）である。

完了証拠は GitHub Issue、PR（#409〜#425 など）、CI、レビューボット、merge 状態に依存する。

`examples/skill-provenance.json` の 4 snapshot（`01-ideation-completed`〜`04-construction-implementation-planned`）は、英語化に伴い全 `skillFiles` に `staleReason` が付いた状態を維持しており、real provider による再生成は Intent 外の後続作業として扱う。

## Issue #396 に関係するコンポーネント

現在の active Intent `260704-v2-parity-completion`（Issue #396、open）は、成果物の双方向一致、skill 一覧の一致、TS エンジン駆動化を扱う。
