# Ideation Phase Stage Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Ideation Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/ideation.md)

## Phase Overview

Ideation phase は、Intent のアウトカム、利害関係者、実現可能性、スコープ境界、バックログ、初期モックを整理し、Inception へ引き継ぐ承認をまとめる phase である。

Ideation は Intake の birth 提案を人間が承認した Intent に対して開始する。

この phase では、Requirement、Story、Unit、Bolt、Domain Model、実装を作らない。

phase 完了は Ideation 成果物の PR と人間 merge で確定する。

## Execution 判定基準

`Execution` と `Condition` の判定は [overview.md](overview.md) と [scopes.md](scopes.md) に従う。

scope が SKIP にするステージは実行しない。
scope が EXECUTE にするステージのうち、`ALWAYS` は必ず実行し、`CONDITIONAL` は `Condition` が真の場合だけ実行する。
実行しなかった `CONDITIONAL` ステージの成果物を、後続ステージの必須入力にしない。

既存成果物がある場合は、再作成ではなく点検または補修で充足してよい。

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 1.1 | Intent Capture & Framing | ALWAYS | 全ワークフローの先頭 | `amadeus-ideation-intent-capture` | Intent のモジュールファイル、`stakeholder-map.md` |
| 1.2 | Market Research | CONDITIONAL | 外部市場での位置づけ、または build-vs-buy の判断がある場合 | `amadeus-ideation-market-research` | `competitive-analysis.md`、`market-trends.md`、`build-vs-buy.md` |
| 1.3 | Feasibility | CONDITIONAL | 統合制約、規制要件、大きな技術不確実性がある場合 | `amadeus-ideation-feasibility` | `feasibility-assessment.md`、`constraint-register.md`、`raid-log.md` |
| 1.4 | Scope Definition | ALWAYS | scope が実行対象にする場合は必ず実行 | `amadeus-ideation-scope-definition` | `scope-document.md`、`intent-backlog.md` |
| 1.5 | Team Formation | CONDITIONAL | チーム構成、キャパシティ、mob 計画が意味を持つ場合 | `amadeus-ideation-team-formation` | `team-assessment.md`、`skill-matrix.md`、`mob-composition.md` |
| 1.6 | Rough Mockups | CONDITIONAL | UI がある場合。API や backend は相互作用図で代替 | `amadeus-ideation-rough-mockups` | `wireframes.md`、`user-flow.md` |
| 1.7 | Approval & Handoff | ALWAYS | scope が実行対象にする場合は必ず実行 | `amadeus-ideation-approval-handoff` | `initiative-brief.md`、`decisions.md`、`traceability.md` |

各ステージは、確認した論点と回答を stage ディレクトリの `questions.md` に記録する。

## Stage 1.1: Intent Capture & Framing

### Metadata

| Property | Value |
|---|---|
| Stage | 1.1 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | 全ワークフローの先頭。Intent の基礎を確立する |
| Lead Skill | `amadeus-ideation-intent-capture` |
| Mode | internal |
| v2 Source | [intent-capture.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/intent-capture.md) |

### Purpose

入力テーマから、解決する問題、対象者、成功指標、契機を確認し、Intent のモジュールファイルと利害関係者の整理を作る。

確認は clarifying questions で行う。
何の業務問題を解くか、顧客は誰でどんな痛みがあるか、成功はどう観測できるか、なぜ今かを確認する。
回答の曖昧さと矛盾を検出し、必要なら追加質問する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| 入力テーマ（Intake の birth 提案で承認された記述） | 必須 | Intake |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `.amadeus/intents/<intent-id>-<slug>.md` | 目的（問題）、対象、成功条件、契機、目標プロファイル、範囲、依存 | intent-statement |
| `ideation/intent-capture/stakeholder-map.md` | 利害関係者、決定者と影響者の区別、コミュニケーション要件 | stakeholder-map |
| `ideation/intent-capture/questions.md` | 確認した質問と回答 | intent-capture-questions |

### Notes

Intent のモジュールファイルは Intake が骨格を作り、このステージが内容を確定する。
成功条件は Intent の受理条件 1（観測可能な成功基準）を満たす形で書く。

## Stage 1.2: Market Research

### Metadata

| Property | Value |
|---|---|
| Stage | 1.2 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | 外部市場での位置づけ、または build-vs-buy の判断がある場合に実行する。社内ツール、バグ修正、リファクタリングでは実行しない |
| Lead Skill | `amadeus-ideation-market-research` |
| Mode | internal |
| v2 Source | [market-research.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/market-research.md) |

### Purpose

競合状況、市場動向、build-vs-buy の判断材料を整理する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Intent のモジュールファイル | 必須 | Stage 1.1 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/market-research/competitive-analysis.md` | 競合分析 | competitive-analysis |
| `ideation/market-research/market-trends.md` | 市場動向 | market-trends |
| `ideation/market-research/build-vs-buy.md` | build-vs-buy の判断材料 | build-vs-buy |
| `ideation/market-research/questions.md` | 確認した質問と回答 | market-research-questions |

## Stage 1.3: Feasibility

### Metadata

| Property | Value |
|---|---|
| Stage | 1.3 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | 統合制約、規制要件、大きな技術不確実性がある場合に実行する。技術リスクのない軽微な変更では実行しない |
| Lead Skill | `amadeus-ideation-feasibility` |
| Mode | internal |
| v2 Source | [feasibility.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/feasibility.md) |

### Purpose

技術、運用、セキュリティ、依存の観点で実現可能性を評価し、交渉不能な制約とリスクを登録する。

制約の登録は、how を書かずに判断材料を渡すための成果物である。
既存アーキテクチャ、期限、コンプライアンス、やらないことを制約として明示する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Intent のモジュールファイル | 必須 | Stage 1.1 |
| `competitive-analysis.md`、`market-trends.md`、`build-vs-buy.md` | 任意 | Stage 1.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/feasibility/feasibility-assessment.md` | 実現可能性の評価 | feasibility-assessment |
| `ideation/feasibility/constraint-register.md` | 交渉不能な制約の一覧 | constraint-register |
| `ideation/feasibility/raid-log.md` | リスク、前提、課題、依存の記録 | raid-log |
| `ideation/feasibility/questions.md` | 確認した質問と回答 | feasibility-questions |

### Notes

旧契約の `ideation/ideation.md` が扱っていた実現可能性、体制、未確定事項は、このステージの成果物へ移る。

## Stage 1.4: Scope Definition

### Metadata

| Property | Value |
|---|---|
| Stage | 1.4 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | scope が実行対象にする場合は必ず実行する。スコープ境界と優先度付きバックログを定義する |
| Lead Skill | `amadeus-ideation-scope-definition` |
| Mode | internal |
| v2 Source | [scope-definition.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/scope-definition.md) |

### Purpose

対象と対象外の境界を定め、価値を出せる最小スコープを確認し、テーマ内の作業候補を優先度付きのスコープバックログとして整理する。

確認する論点は、最小の価値あるスコープ、must-have と nice-to-have の区別、作業候補間の依存、順序の好み（リスク先行、価値先行、依存先行）、期限である。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Intent のモジュールファイル | 必須 | Stage 1.1 |
| `feasibility-assessment.md`、`constraint-register.md` | 任意 | Stage 1.3 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/scope-definition/scope-document.md` | 対象と対象外の境界 | scope-document |
| `ideation/scope-definition/intent-backlog.md` | 優先度付きの proto-Unit 一覧。今回やらないものの受け皿 | intent-backlog |
| `ideation/scope-definition/questions.md` | 確認した質問と回答 | scope-definition-questions |

### Notes

スコープバックログの項目は将来 Intent の予約席ではない。
Units Generation の Unit 候補、または Intake の合流判定の照合先として使う。

優先度付けは MoSCoW を基本にし、必要に応じて WSJF または RICE を使う。

旧契約の `ideation/scope.md` はこのステージの 2 成果物へ移る。

## Stage 1.5: Team Formation

### Metadata

| Property | Value |
|---|---|
| Stage | 1.5 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | チーム構成、キャパシティ、mob 計画が意味を持つ場合に実行する。単独開発者や小規模チームでは実行しない |
| Lead Skill | `amadeus-ideation-team-formation` |
| Mode | internal |
| v2 Source | [team-formation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/team-formation.md) |

### Purpose

スコープとバックログに対して、チームの体制、スキル、mob 構成を評価する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `scope-document.md`、`intent-backlog.md` | 必須 | Stage 1.4 |
| `feasibility-assessment.md` | 任意 | Stage 1.3 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/team-formation/team-assessment.md` | 体制評価 | team-assessment |
| `ideation/team-formation/skill-matrix.md` | スキルマトリクス | skill-matrix |
| `ideation/team-formation/mob-composition.md` | mob 構成 | mob-composition |
| `ideation/team-formation/questions.md` | 確認した質問と回答 | team-formation-questions |

## Stage 1.6: Rough Mockups

### Metadata

| Property | Value |
|---|---|
| Stage | 1.6 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | UI が対象に含まれる場合に実行する。API や backend はシステム相互作用図を作る。UI もシステム相互作用もない場合は実行しない |
| Lead Skill | `amadeus-ideation-rough-mockups` |
| Mode | internal |
| v2 Source | [rough-mockups.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/rough-mockups.md) |

### Purpose

後続の要求とユースケースの具体例として確認できる粒度で、ワイヤーフレームとユーザーフローを作る。

高忠実度の UI は作らない。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Intent のモジュールファイル | 必須 | Stage 1.1 |
| `scope-document.md`、`intent-backlog.md` | 必須 | Stage 1.4 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/rough-mockups/wireframes.md` | ワイヤーフレームまたはシステム相互作用図 | wireframes |
| `ideation/rough-mockups/user-flow.md` | ユーザーフロー | user-flow |
| `ideation/rough-mockups/questions.md` | 確認した質問と回答 | rough-mockups-questions |

### Notes

図は Markdown に内包できる PlantUML または Mermaid で書く。
旧契約の `ideation/mocks/*.puml` はこのステージの成果物へ移る。

## Stage 1.7: Approval & Handoff

### Metadata

| Property | Value |
|---|---|
| Stage | 1.7 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | scope が実行対象にする場合は必ず実行する。Ideation 成果物を initiative brief にまとめて承認を得る |
| Lead Skill | `amadeus-ideation-approval-handoff` |
| Mode | internal |
| v2 Source | [approval-handoff.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/aidlc-common/stages/ideation/approval-handoff.md) |

### Purpose

Ideation の全成果物を initiative brief に集約し、判断の記録を確定し、Inception への引き継ぎ承認を得る。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Intent のモジュールファイル | 必須 | Stage 1.1 |
| `scope-document.md`、`intent-backlog.md` | 必須 | Stage 1.4 |
| `competitive-analysis.md` | 任意 | Stage 1.2 |
| `feasibility-assessment.md`、`constraint-register.md` | 任意 | Stage 1.3 |
| `team-assessment.md` | 任意 | Stage 1.5 |
| `wireframes.md` | 任意 | Stage 1.6 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `ideation/approval-handoff/initiative-brief.md` | Ideation 成果物の集約 | initiative-brief |
| `ideation/decisions.md` と `ideation/decisions/` | phase の確定判断 | decision-log |
| `ideation/traceability.md` | Ideation 成果物の追跡 | Amadeus 拡張 |
| `ideation/approval-handoff/questions.md` | 確認した質問と回答 | approval-handoff-questions |

### Notes

このステージの承認後、Ideation 成果物を phase PR にまとめ、人間 merge で phase 完了を確定する。
`state.json` の phase 遷移は merge 後に記録する。

mvp、poc、bugfix など、このステージを scope が SKIP にする場合は、最後に実行した Ideation ステージの承認と phase PR が引き継ぎを兼ねる。
