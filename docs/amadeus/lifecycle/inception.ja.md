# Inception Phase Stage Reference（Inception phase ステージリファレンス）

## AI-DLC v2 Reference

- [AI-DLC v2 Inception Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/inception.md)

## Phase Overview

Inception phase は、既存コードの理解、チームプラクティスの発見、要求、ストーリー、アプリケーション設計、Unit の依存 DAG、Bolt 計画を作る phase である。

Inception は、要求からトポロジ（Unit と依存）までを確定し、実行順序の経済判断（何を先に出荷するか）を Delivery Planning に分離する。

この phase では、Domain Model の詳細、実装、テスト実行を扱わない。

phase 共通入力として、全ステージが steering/memory 参照（`org.md`、`team.md`、`project.md`、`phases/inception.md` = エンジンの rules_in_context）を読む。
各ステージの Inputs 表にはこの共通入力を繰り返さない（記法は [overview.md](overview.ja.md) の「ステージ契約の I/O 記法」を参照）。

phase 完了は Inception 成果物の PR と人間 merge で確定する。

## Execution 判定基準

`Execution` と `Condition` の判定は [overview.md](overview.ja.md) と [scopes.md](scopes.ja.md) に従う。

brownfield とは、変更対象の既存コードがある状態を指す。
brownfield 条件の入力は、greenfield では要求しない。

既存成果物がある場合は、再作成ではなく点検または補修で充足してよい。

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 2.1 | Reverse Engineering | CONDITIONAL | brownfield の場合。鮮度維持のため毎回再実行 | `amadeus-inception-reverse-engineering` | `codekb/<repo>/` の 9 成果物 |
| 2.2 | Practices Discovery | CONDITIONAL | 鮮度維持のため毎回再実行。brownfield は証拠から、greenfield は質問で発見 | `amadeus-inception-practices-discovery` | `team-practices.md`、`discovered-rules.md`、`evidence.md` |
| 2.3 | Requirements Analysis | ALWAYS | scope が実行対象にする場合は必ず実行 | `amadeus-inception-requirements-analysis` | `requirements.md` |
| 2.4 | User Stories | CONDITIONAL | 利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断がある場合 | `amadeus-inception-user-stories` | `stories.md`、`personas.md`、`user-stories-assessment.md` |
| 2.5 | Refined Mockups | CONDITIONAL | UI があり Ideation で rough mockups を作った場合 | `amadeus-inception-refined-mockups` | `mockups.md`、`interaction-spec.md` ほか |
| 2.6 | Application Design | CONDITIONAL | 新しいコンポーネントやサービスの設計が必要な場合 | `amadeus-inception-application-design` | `components.md`、`services.md` ほか |
| 2.7 | Units Generation | ALWAYS | scope が実行対象にする場合は必ず実行 | `amadeus-inception-units-generation` | `unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` |
| 2.8 | Delivery Planning | ALWAYS | scope が実行対象にする場合は必ず実行 | `amadeus-inception-delivery-planning` | `bolt-plan.md` ほか |

各ステージは、確認した論点と回答を stage ディレクトリの `<stage-slug>-questions.md` に記録する。

## Stage 2.1: Reverse Engineering

### Metadata

| Property | Value |
|---|---|
| Stage | 2.1 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | brownfield の場合に実行する。鮮度維持のため毎回再実行する。greenfield では実行しない |
| Lead Skill | `amadeus-inception-reverse-engineering` |
| Mode | internal（subagent 委譲可） |
| v2 Source | [reverse-engineering.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/reverse-engineering.md) |

### Purpose

既存コードベースを解析し、業務概要、アーキテクチャ、コード構造、API、コンポーネント一覧、技術スタック、依存、品質評価を記録する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| 対象リポジトリのコード | 必須 | workspace |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `codekb/<repo>/business-overview.md` | 業務概要 | business-overview |
| `codekb/<repo>/architecture.md` | アーキテクチャ | architecture |
| `codekb/<repo>/code-structure.md` | コード構造 | code-structure |
| `codekb/<repo>/api-documentation.md` | API 文書 | api-documentation |
| `codekb/<repo>/component-inventory.md` | コンポーネント一覧 | component-inventory |
| `codekb/<repo>/technology-stack.md` | 技術スタック | technology-stack |
| `codekb/<repo>/dependencies.md` | 依存関係 | dependencies |
| `codekb/<repo>/code-quality-assessment.md` | 品質評価 | code-quality-assessment |
| `codekb/<repo>/timestamp.md` | 解析時刻と鮮度 | reverse-engineering-timestamp |
| `inception/reverse-engineering/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

成果物は Intent 配下ではなく Space の `codekb/<repo>/` 配下に置き、Intent をまたいで再利用する。
旧契約の `inception/codebase-analysis.md` はこのステージの成果物へ移る。

## Stage 2.2: Practices Discovery

### Metadata

| Property | Value |
|---|---|
| Stage | 2.2 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | 鮮度維持のため毎回再実行する。brownfield は証拠と Reverse Engineering 成果物から発見し、greenfield は構造化質問で確認する |
| Lead Skill | `amadeus-inception-practices-discovery` |
| Mode | internal |
| v2 Source | [practices-discovery.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/practices-discovery.md) |

### Purpose

チームの開発プラクティス（ブランチ戦略、テスト方針、デプロイ、品質基準）を発見し、証拠付きで記録する。

人間が確認したプラクティスは Space の `memory/team.md` へ昇格し、以後の Intent が参照する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `codekb/<repo>/` の成果物 | 条件付き（brownfield） | Stage 2.1 |
| Space の既存 `memory/team.md` | 任意 | Space |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/practices-discovery/team-practices.md` | 発見したプラクティス | team-practices |
| `inception/practices-discovery/discovered-rules.md` | ルール候補 | discovered-rules |
| `inception/practices-discovery/evidence.md` | 発見の根拠 | evidence |
| `inception/practices-discovery/practices-discovery-timestamp.md` | 発見時刻と鮮度 | practices-discovery-timestamp |
| `inception/practices-discovery/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

昇格先は Space の `memory/team.md` である。
昇格は人間の承認を要する。

## Stage 2.3: Requirements Analysis

### Metadata

| Property | Value |
|---|---|
| Stage | 2.3 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | scope が実行対象にする場合は必ず実行する。深さは depth に従う |
| Lead Skill | `amadeus-inception-requirements-analysis` |
| Mode | internal |
| v2 Source | [requirements-analysis.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/requirements-analysis.md) |

### Purpose

Intent を検証可能な要求へ落とす。
各要求は識別子と受け入れ条件を持ち、成功条件から追跡できるようにする。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| record の audit shard にある user project description | 必須 | Intake |
| `intent-statement.md` | 任意 | Stage 1.1 |
| `scope-document.md` | 任意 | Stage 1.4 |
| `codekb/<repo>/` の成果物 | 条件付き（brownfield） | Stage 2.1 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/requirements-analysis/requirements.md` | 要求一覧。各要求に識別子と受け入れ条件を含める | requirements |
| `inception/requirements-analysis/requirements-analysis-questions.md` | 確認した質問と回答 | requirements-analysis-questions |
| `inception/requirements-analysis/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

受け入れ条件は各要求に内包する。
旧契約の `inception/acceptance.md` は退役し、独立した成果物にしない。
要求が多い場合は `requirements/<requirement-id>.md` へ分割してよい。
その場合も `requirements.md` を一覧として維持する。

## Stage 2.4: User Stories

### Metadata

| Property | Value |
|---|---|
| Stage | 2.4 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | 利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある場合に実行する。純粋なリファクタリング、単発のバグ修正、インフラのみの変更、開発者ツールでは実行しない |
| Lead Skill | `amadeus-inception-user-stories` |
| Mode | internal |
| v2 Source | [user-stories.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/user-stories.md) |

### Purpose

要求を人間アクターの価値表現へ落とし、ペルソナを整理する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `requirements.md` | 必須 | Stage 2.3 |
| `business-overview.md`、`component-inventory.md` | 条件付き（brownfield） | Stage 2.1 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/user-stories/stories.md` | ユーザーストーリー一覧 | stories |
| `inception/user-stories/personas.md` | ペルソナ | personas |
| `inception/user-stories/user-stories-assessment.md` | ストーリーの充足評価 | user-stories-assessment |
| `inception/user-stories/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

旧契約の use-cases ステージは退役する。
アクターとシステムの相互作用の具体化は、このステージと Construction の Functional Design が担う。

## Stage 2.5: Refined Mockups

### Metadata

| Property | Value |
|---|---|
| Stage | 2.5 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | UI があり、Ideation で rough mockups を作った場合に実行する。API は相互作用図を精緻化する |
| Lead Skill | `amadeus-inception-refined-mockups` |
| Mode | internal |
| v2 Source | [refined-mockups.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/refined-mockups.md) |

### Purpose

rough mockups を、要求とストーリーに対応づけた詳細モックへ精緻化する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `wireframes.md`、`user-flow.md` | 必須（Rough Mockups 実行時） | Stage 1.6 |
| `requirements.md` | 必須 | Stage 2.3 |
| `stories.md` | 任意 | Stage 2.4 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/refined-mockups/mockups.md` | 詳細モック | mockups |
| `inception/refined-mockups/interaction-spec.md` | 相互作用仕様 | interaction-spec |
| `inception/refined-mockups/design-system-mapping.md` | デザインシステム対応 | design-system-mapping |
| `inception/refined-mockups/accessibility-checklist.md` | アクセシビリティ確認 | accessibility-checklist |
| `inception/refined-mockups/refined-mockups-questions.md` | 確認した質問と回答 | refined-mockups-questions |
| `inception/refined-mockups/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

## Stage 2.6: Application Design

### Metadata

| Property | Value |
|---|---|
| Stage | 2.6 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | 新しいコンポーネントやサービスが必要な場合、またはサービス層の設計が必要な場合に実行する。既存コンポーネントの修正だけの場合は実行しない |
| Lead Skill | `amadeus-inception-application-design` |
| Mode | internal |
| v2 Source | [application-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/application-design.md) |

### Purpose

要求とストーリーから、コンポーネント、メソッド境界、サービス、依存関係を設計する。

Unit 境界の材料になるアーキテクチャをここで確定する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `requirements.md` | 必須 | Stage 2.3 |
| `stories.md` | 任意 | Stage 2.4 |
| `architecture.md`、`component-inventory.md` | 条件付き（brownfield） | Stage 2.1 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/application-design/components.md` | コンポーネント一覧と責務 | components |
| `inception/application-design/component-methods.md` | コンポーネントのメソッド境界 | component-methods |
| `inception/application-design/services.md` | サービス設計 | services |
| `inception/application-design/component-dependency.md` | コンポーネント依存 | component-dependency |
| `inception/application-design/decisions.md` | 設計判断 | decisions |
| `inception/application-design/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

`application-design/decisions.md` はこのステージの設計判断を扱い、phase 直下の `inception/decisions.md`（phase の確定判断）とは分ける。
旧契約の Unit Design Brief はこのステージと Functional Design が置き換える。

## Stage 2.7: Units Generation

### Metadata

| Property | Value |
|---|---|
| Stage | 2.7 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | scope が実行対象にする場合は必ず実行する。2.8 Delivery Planning と対で実行する |
| Lead Skill | `amadeus-inception-units-generation` |
| Mode | internal |
| v2 Source | [units-generation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/units-generation.md) |

### Purpose

Application Design と要求から、Unit と依存 DAG を生成する。

このステージはトポロジ（Unit の境界と依存）だけを作る。
実装順序、critical path の推奨、経済的な順序付けは扱わない。
それらは Stage 2.8 Delivery Planning の責務である。

Unit の境界戦略（サービス別、機能別、ドメイン別、デプロイ対象別）と粒度（粗い、細かい）は、構造化質問で人間に確認する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md` | 必須（Application Design 実行時） | Stage 2.6 |
| `requirements.md` | 必須 | Stage 2.3 |
| `stories.md` | 任意 | Stage 2.4 |

Application Design を実行しなかった場合は、[scopes.md](scopes.ja.md) の縮退時の入力代替に従い、Reverse Engineering の成果物または `requirements.md` から Unit 境界を判断する。

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/units-generation/unit-of-work.md` | Unit 一覧 | unit-of-work |
| `inception/units-generation/unit-of-work-dependency.md` | Unit の依存 DAG | unit-of-work-dependency |
| `inception/units-generation/unit-of-work-story-map.md` | Unit とストーリーの対応。stories がある場合のみ | unit-of-work-story-map |
| `inception/units-generation/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

スコープバックログの項目は、このステージで Unit 候補として評価する。
Unit が多い場合は `units/<unit-id>-<slug>.md` へ分割してよい。
その場合も `unit-of-work.md` を一覧として維持する。

## Stage 2.8: Delivery Planning

### Metadata

| Property | Value |
|---|---|
| Stage | 2.8 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | scope が実行対象にする場合は必ず実行する。Inception の最終ステージとして Construction の実行計画を作る |
| Lead Skill | `amadeus-inception-delivery-planning` |
| Mode | internal |
| v2 Source | [delivery-planning.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/delivery-planning.md) |

### Purpose

Unit の依存 DAG に対して経済的な順序付けを行い、Bolt 計画を作る。

Bolt の束ね方（Unit 1 個ずつ、関連 Unit の束、Unit をまたぐ薄いスライス）は構造化質問で人間に確認する。
最初の Bolt は、アーキテクチャを貫通する最小スライス（walking skeleton）にする。

各 Bolt には Definition of Done と、その Bolt の出荷が何を証明するか（confidence hypothesis）を付ける。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `unit-of-work.md`、`unit-of-work-dependency.md` | 必須 | Stage 2.7 |
| `unit-of-work-story-map.md` | 任意 | Stage 2.7 |
| `requirements.md` | 必須 | Stage 2.3 |
| `components.md` | 必須（Application Design 実行時） | Stage 2.6 |
| `stories.md`、`mockups.md` | 任意 | Stage 2.4、2.5 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `inception/delivery-planning/bolt-plan.md` | Bolt 一覧、Unit の束ね、実行順序、Definition of Done、confidence hypothesis | bolt-plan |
| `inception/delivery-planning/team-allocation.md` | Bolt への担当割り当て。チームがある場合のみ | team-allocation |
| `inception/delivery-planning/risk-and-sequencing-rationale.md` | 順序付けの根拠とリスク | risk-and-sequencing-rationale |
| `inception/delivery-planning/external-dependency-map.md` | 外部依存の対応 | external-dependency-map |
| `inception/delivery-planning/delivery-planning-questions.md` | 確認した質問と回答 | delivery-planning-questions |
| `inception/delivery-planning/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

旧契約の `inception/bolts.md` と `bolts/<bolt-id>-<slug>.md` は `bolt-plan.md` が置き換える。
Bolt が多い場合は `bolts/<bolt-id>-<slug>.md` へ分割してよい。

このステージの承認後、Inception 成果物を phase PR にまとめ、人間 merge で phase 完了を確定する。
phase の `decisions.md` と `traceability.md` は phase PR までに確定する。
`PHASE_VERIFIED` イベントの追記と Phase Progress の更新は merge 後に行う。
