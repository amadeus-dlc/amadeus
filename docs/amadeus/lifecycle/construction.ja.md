# Construction Phase Stage Reference（Construction phase ステージリファレンス）

## AI-DLC v2 Reference

- [AI-DLC v2 Construction Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/construction.md)

## Phase Overview

Construction phase は、Bolt 計画に従って Unit を設計、実装、検証する phase である。

Construction は Bolt を実行単位にする。
1 つの Bolt は、bolt-plan が束ねた Unit 群に対して Stage 3.1 から 3.6 を 1 周し、branch と worktree で隔離して実行する。
Stage 3.1 から 3.5 は Unit ごとに実行し、Stage 3.6 は Bolt 内の全 Unit 完了後に 1 回実行する。
Stage 3.7 は Intent 単位で必要な場合に実行する。

Units Generation と Delivery Planning を実行しない scope（bugfix、poc、refactor、security-patch）では、Intent 全体を単一の暗黙 Unit と単一の暗黙 Bolt として 1 周する。
必須入力の供給ステージが `skipped` の場合の扱いは、[scopes.md](scopes.ja.md) の縮退時の入力代替に従う。

phase 共通入力として、全ステージが steering/memory 参照（`org.md`、`team.md`、`project.md`、`phases/construction.md` = エンジンの rules_in_context）を読む。
各ステージの Inputs 表にはこの共通入力を繰り返さない（記法は [overview.md](overview.ja.md) の「ステージ契約の I/O 記法」を参照）。

Bolt の完了は PR と人間 merge で確定する。
Bolt の実行状態は、Project Information の `Bolt Refs` と、audit の `BOLT_STARTED` / `BOLT_COMPLETED` イベントで追跡する。

## Execution 判定基準

`Execution` と `Condition` の判定は [overview.md](overview.ja.md) と [scopes.md](scopes.ja.md) に従う。

Construction の質問は例外扱いにする。
判断は前段の成果物で済んでいる前提であり、前段が扱わなかった本物の欠落を検出した場合だけ質問する。

既存成果物がある場合は、再作成ではなく点検または補修で充足してよい。

## Bolt ゲート

Construction には、ステージゲートに加えて 3 つの Bolt ゲートがある。

**walking skeleton ゲート**：最初の Bolt は、設計成果物と生成コードをまとめて必ず人間が承認する。
`Construction Autonomy Mode` の設定に関わらず省略しない。

**ladder 提案**：walking skeleton の承認直後に一度だけ、残りの Bolt を自律実行するか、Bolt ごとにゲートを続けるかを確認し、回答を Current Status の `Construction Autonomy Mode`（`autonomous` または `gated`）に記録する。

**halt-and-ask**：`Construction Autonomy Mode` が `autonomous` でも、失敗した Bolt は停止して人間に確認する。
失敗 Bolt だけを retry または skip できる。

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 3.1 | Functional Design | CONDITIONAL | 新しいデータモデル、複雑な業務ロジック、業務ルールの設計が必要な場合 | `amadeus-construction-functional-design` | `business-logic-model.md` ほか |
| 3.2 | NFR Requirements | CONDITIONAL | 性能、セキュリティ、スケーラビリティ、技術スタック選定が必要な場合 | `amadeus-construction-nfr-requirements` | `performance-requirements.md` ほか |
| 3.3 | NFR Design | CONDITIONAL | NFR Requirements を実行し、NFR パターンの設計が必要な場合 | `amadeus-construction-nfr-design` | `performance-design.md` ほか |
| 3.4 | Infrastructure Design | CONDITIONAL | インフラサービスの対応付けやデプロイ設計が必要な場合 | `amadeus-construction-infrastructure-design` | `deployment-architecture.md` ほか |
| 3.5 | Code Generation | ALWAYS | 実行計画の各 Unit で必ず実行 | `amadeus-construction-code-generation` | コード、`code-generation-plan.md`、`code-summary.md` |
| 3.6 | Build and Test | ALWAYS | Bolt 内の全 Unit 完了後に 1 回必ず実行 | `amadeus-construction-build-and-test` | `build-test-results.md` ほか |
| 3.7 | CI Pipeline | CONDITIONAL | CI の新設または大きな変更が必要な場合 | `amadeus-construction-ci-pipeline` | `ci-config.md`、`quality-gates.md` |

Unit 単位ステージ（3.1〜3.5）の成果物は `construction/<unit-id>-<slug>/<stage-slug>/` に置く。
Bolt 実行の記録（3.6 と PR）は `construction/bolts/<bolt-id>-<slug>/` に置く。

## Stage 3.1: Functional Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.1 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | 新しいデータモデル、複雑な業務ロジック、業務ルールの設計が必要な場合に実行する。新しい業務ロジックのない単純な変更では実行しない |
| Lead Skill | `amadeus-construction-functional-design` |
| Mode | internal |
| 実行単位 | Unit ごと |
| v2 Source | [functional-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/functional-design.md) |

### Purpose

対象 Unit の業務ロジックモデル、業務ルール、ドメインエンティティを設計する。
UI がある Unit ではフロントエンドコンポーネントの構成も設計する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `unit-of-work.md`（対象 Unit） | 必須（Units Generation 実行時） | Stage 2.7 |
| `unit-of-work-story-map.md` | 任意 | Stage 2.7 |
| `requirements.md` | 必須 | Stage 2.3 |
| `components.md`、`component-methods.md`、`services.md` | 必須（Application Design 実行時） | Stage 2.6 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/<unit>/functional-design/business-logic-model.md` | 業務ロジックモデル | business-logic-model |
| `construction/<unit>/functional-design/business-rules.md` | 業務ルール | business-rules |
| `construction/<unit>/functional-design/domain-entities.md` | ドメインエンティティ | domain-entities |
| `construction/<unit>/functional-design/frontend-components.md` | フロントエンド構成。UI がある場合のみ | frontend-components |
| `construction/<unit>/functional-design/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

`amadeus-domain-modeling` と Event Storming の成果物（Aggregate Candidate、Bounded Context Candidate）は、このステージの判断材料として参照する。

## Stage 3.2: NFR Requirements

### Metadata

| Property | Value |
|---|---|
| Stage | 3.2 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | 性能要件、セキュリティ考慮、スケーラビリティ、技術スタック選定が必要な場合に実行する。NFR がなく技術スタックが確定済みの場合は実行しない |
| Lead Skill | `amadeus-construction-nfr-requirements` |
| Mode | internal |
| 実行単位 | Unit ごと |
| v2 Source | [nfr-requirements.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/nfr-requirements.md) |

### Purpose

対象 Unit の非機能要求（性能、セキュリティ、スケーラビリティ、信頼性）と技術スタックの判断を確定する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `business-logic-model.md`、`business-rules.md` | 必須（Functional Design 実行時） | Stage 3.1 |
| `requirements.md` | 必須（Requirements Analysis 実行時） | Stage 2.3 |
| `technology-stack.md` | 条件付き（brownfield） | Stage 2.1 |

security-patch では Requirements Analysis を実行しないため、このステージが要求の捕捉を兼ねる。

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/<unit>/nfr-requirements/performance-requirements.md` | 性能要求 | performance-requirements |
| `construction/<unit>/nfr-requirements/security-requirements.md` | セキュリティ要求 | security-requirements |
| `construction/<unit>/nfr-requirements/scalability-requirements.md` | スケーラビリティ要求 | scalability-requirements |
| `construction/<unit>/nfr-requirements/reliability-requirements.md` | 信頼性要求 | reliability-requirements |
| `construction/<unit>/nfr-requirements/tech-stack-decisions.md` | 技術スタックの判断 | tech-stack-decisions |
| `construction/<unit>/nfr-requirements/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

## Stage 3.3: NFR Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.3 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | NFR Requirements を実行し、NFR パターンの設計が必要な場合に実行する。NFR Requirements を実行しなかった場合は実行しない |
| Lead Skill | `amadeus-construction-nfr-design` |
| Mode | internal |
| 実行単位 | Unit ごと |
| v2 Source | [nfr-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/nfr-design.md) |

### Purpose

NFR 要求を満たす設計（性能、セキュリティ、スケーラビリティ、信頼性、論理コンポーネント）を作る。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| NFR Requirements の 5 成果物 | 必須（NFR Requirements 実行時） | Stage 3.2 |
| `business-logic-model.md` | 必須（Functional Design 実行時） | Stage 3.1 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/<unit>/nfr-design/performance-design.md` | 性能設計 | performance-design |
| `construction/<unit>/nfr-design/security-design.md` | セキュリティ設計 | security-design |
| `construction/<unit>/nfr-design/scalability-design.md` | スケーラビリティ設計 | scalability-design |
| `construction/<unit>/nfr-design/reliability-design.md` | 信頼性設計 | reliability-design |
| `construction/<unit>/nfr-design/logical-components.md` | 論理コンポーネント | logical-components |
| `construction/<unit>/nfr-design/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

## Stage 3.4: Infrastructure Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.4 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | インフラサービスの対応付け、デプロイアーキテクチャ、クラウドリソースが必要な場合に実行する。インフラ変更がなく定義済みの場合は実行しない |
| Lead Skill | `amadeus-construction-infrastructure-design` |
| Mode | internal |
| 実行単位 | Unit ごと |
| v2 Source | [infrastructure-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/infrastructure-design.md) |

### Purpose

NFR 設計とアプリケーション設計から、デプロイアーキテクチャ、インフラサービス、監視、CI/CD パイプラインの設計を作る。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| NFR Design の 5 成果物 | 必須（NFR Design 実行時） | Stage 3.3 |
| `components.md`、`services.md` | 必須（Application Design 実行時） | Stage 2.6 |
| `business-logic-model.md` | 必須（Functional Design 実行時） | Stage 3.1 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/<unit>/infrastructure-design/deployment-architecture.md` | デプロイアーキテクチャ | deployment-architecture |
| `construction/<unit>/infrastructure-design/infrastructure-services.md` | インフラサービス対応 | infrastructure-services |
| `construction/<unit>/infrastructure-design/monitoring-design.md` | 監視設計 | monitoring-design |
| `construction/<unit>/infrastructure-design/cicd-pipeline.md` | CI/CD 設計 | cicd-pipeline |
| `construction/<unit>/infrastructure-design/shared-infrastructure.md` | 共有インフラ。該当がある場合のみ | shared-infrastructure |
| `construction/<unit>/infrastructure-design/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

Amadeus は Operation phase を対象外にするため、デプロイの実行はこのステージの設計成果物を根拠に人間が行う。

## Stage 3.5: Code Generation

### Metadata

| Property | Value |
|---|---|
| Stage | 3.5 |
| Phase | Construction |
| Execution | ALWAYS |
| Condition | 実行計画の各 Unit で必ず実行する |
| Lead Skill | `amadeus-construction-code-generation` |
| Mode | internal（subagent 委譲可） |
| 実行単位 | Unit ごと。Bolt の worktree 内で実行 |
| v2 Source | [code-generation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/code-generation.md) |

### Purpose

対象 Unit の設計成果物を入力に、実装計画を立て、コードとテストコードを生成する。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `unit-of-work.md`（対象 Unit） | 必須（Units Generation 実行時） | Stage 2.7 |
| `requirements.md` | 必須（Requirements Analysis 実行時） | Stage 2.3 |
| Functional Design の成果物 | 任意 | Stage 3.1 |
| NFR Design、Infrastructure Design の成果物 | 任意 | Stage 3.3、3.4 |

Units Generation を実行しない scope では、暗黙 Unit として Intent 全体を 1 回で実装する。
security-patch では `security-requirements.md` を要求の定義元にする。

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| アプリケーションコードとテストコード | 対象リポジトリへの変更 | application code |
| `construction/<unit>/code-generation/code-generation-plan.md` | 実装計画 | code-generation-plan |
| `construction/<unit>/code-generation/code-summary.md` | 実装結果の要約 | code-summary |
| `construction/<unit>/code-generation/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

旧契約の Bolt preparation と `tasks.md` は `code-generation-plan.md` が置き換える。
実装は Bolt の branch と worktree で隔離し、Git Branching Policy に従う。

## Stage 3.6: Build and Test

### Metadata

| Property | Value |
|---|---|
| Stage | 3.6 |
| Phase | Construction |
| Execution | ALWAYS |
| Condition | Bolt 内の全 Unit の Code Generation 完了後に 1 回必ず実行する |
| Lead Skill | `amadeus-construction-build-and-test` |
| Mode | internal |
| 実行単位 | Bolt ごとに 1 回 |
| v2 Source | [build-and-test.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/build-and-test.md) |

### Purpose

Bolt 全体のビルドとテストを実行し、手順と結果を記録する。

テストの量は depth のテスト戦略に従う。
Minimal は要求 1 件につきテスト 1 件と happy-path の下限、Standard はコンポーネント境界の検証、Comprehensive は網羅的な検証を行う。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| Bolt 内全 Unit の `code-generation-plan.md` と `code-summary.md` | 必須 | Stage 3.5 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/bolts/<bolt-id>-<slug>/build-instructions.md` | ビルド手順 | build-instructions |
| `construction/bolts/<bolt-id>-<slug>/unit-test-instructions.md` | ユニットテスト手順 | unit-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/integration-test-instructions.md` | 統合テスト手順。実行した場合 | integration-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/performance-test-instructions.md` | 性能テスト手順。実行した場合 | performance-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/security-test-instructions.md` | セキュリティテスト手順。実行した場合 | security-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/build-and-test-summary.md` | ビルドとテストの要約 | build-and-test-summary |
| `construction/bolts/<bolt-id>-<slug>/build-test-results.md` | テスト実行結果 | build-test-results |
| `construction/bolts/<bolt-id>-<slug>/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

失敗時処理は Amadeus DLC の意図的差分である。
AI-DLC v2 は Build and Test が診断と修正を最大 2 回試みるが、Amadeus DLC はこのステージで実装修正を行わない。
失敗時は autonomy mode に関わらず停止し、失敗内容を `build-test-results.md` に記録して人間へ確認する（halt-and-ask）。
修正は人間の指示の下で対象 Unit の Code Generation の修正として行い、再実行は失敗原因に関係する手順だけをやり直す。
理由と本家との対比は [AI-DLC v2 Build and Test Failure Handling](../aidlc-v2-build-and-test-failure-handling.ja.md) に従う。

このステージの完了後、Bolt の PR を作成する。
PR の説明には Definition of Done と confidence hypothesis を記載し、merge 後に `construction/bolts/<bolt-id>-<slug>/pr.md` へ記録する。
`pr.md` は Amadeus 拡張の成果物である。

## Stage 3.7: CI Pipeline

### Metadata

| Property | Value |
|---|---|
| Stage | 3.7 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | CI パイプラインの新設または大きな変更が必要な場合に実行する。十分な CI が既にある場合は実行しない |
| Lead Skill | `amadeus-construction-ci-pipeline` |
| Mode | internal |
| 実行単位 | Intent ごと |
| v2 Source | [ci-pipeline.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/ci-pipeline.md) |

### Purpose

ビルドとテストの結果から、CI 設定と品質ゲートを設計する。

CI のトリガー設計（push、PR、tag）は、Practices Discovery で確認したチームプラクティスに従う。

### Inputs

| Artifact | 必須 | 供給元 |
|---|---|---|
| `build-and-test-summary.md`、`build-test-results.md` | 必須 | Stage 3.6 |
| `team-practices.md` | 任意 | Stage 2.2 |

### Outputs

| Artifact | Description | v2 対応 |
|---|---|---|
| `construction/ci-pipeline/ci-config.md` | CI 設定の設計 | ci-config |
| `construction/ci-pipeline/quality-gates.md` | 品質ゲート | quality-gates |
| `construction/ci-pipeline/ci-pipeline-questions.md` | 確認した質問と回答 | ci-pipeline-questions |
| `construction/ci-pipeline/memory.md` | stage 実行の学習記録（Interpretations、Deviations、Tradeoffs、Open questions） | memory |

### Notes

全 Bolt の完了後、phase の `decisions.md` と `traceability.md` を確定し、Intent の完了を `amadeus-state.md` の `Status`（`Completed`）と `audit/` の shard の `WORKFLOW_COMPLETED` に記録する。
