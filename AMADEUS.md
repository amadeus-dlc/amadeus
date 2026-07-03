# Amadeus DLC

この文書は、エージェントがこのリポジトリで Amadeus を扱うときの共通入口である。
概要は [README.md](README.md) を参照する。
詳細な成果物契約は [docs/amadeus/lifecycle/](docs/amadeus/lifecycle/overview.md) と [docs/amadeus/steering.md](docs/amadeus/steering.md) を参照する。

## 作業言語

- 返答、仕様、調査メモ、検証結果は日本語で書く。
- 日本語の技術文書を書く、または推敲するときは `japanese-tech-writing` skill の規範に従う。
- 英語の識別子、ファイル名、コマンド名は必要な場合だけ使う。

## Project Context

### Paths

- Steering layer: 対象 workspace の `.amadeus/` 直下の成果物
- Intent layer: 対象 workspace の `.amadeus/intents/<intent-id>-<slug>/`
- Skill sources: `skills/amadeus*/`
- Promoted skills: `.agents/skills/amadeus*/`

### Steering layer

Steering layer は、複数 Intent で共有する前提を扱う。
このリポジトリの root `.amadeus/` は、Amadeus 本体開発用の steering layer である。

### Intent layer

Intent layer は、特定 Intent のライフサイクル成果物（各ステージの成果物、判断、追跡、`state.json`）を扱う。
Intent 一覧は `.amadeus/intents.md` を参照する。

## Skills

ライフサイクルの公開入口は `amadeus` の 1 個である。

`amadeus` は、Intake（合流既定、受理条件の確認、scope 推定、人間承認付きの Birth 提案）と、`state.json` に基づく次ステージの解決だけを行い、ステージ成果物の作成はステージ内部 skill（Ideation 7、Inception 8、Construction 7）に委譲する。
ステージと skill の対応は [skills/amadeus/references/stage-catalog.md](skills/amadeus/references/stage-catalog.md) に従う。

補助入口は次の 6 個である。

1. `amadeus-steering`
2. `amadeus-event-storming`
3. `amadeus-grilling`
4. `amadeus-domain-modeling`
5. `amadeus-domain-grilling`
6. `amadeus-validator`

Intake は、入力が既存 Intent のアウトカムに属する場合、新しい Intent を作らずスコープバックログへの合流を提案する。
新しい Intent は、人間の明示承認なしに作らない。
scope（bugfix、refactor など）が SKIP にするステージは実行しない。

Construction は Bolt を実行単位にし、walking skeleton の Bolt PR は必ず人間が承認する。
Construction では、Spec、`.kiro/specs/**`、`openspec/**`、Operation 成果物を作らない。

Event Storming は、Domain Event、Process、Aggregate Candidate、Bounded Context Candidate、Hotspot を整理する補助分析入口である。
Event Storming は phase を進めず、Requirement、Use Case、Unit、Bolt、Task、Aggregate、Bounded Context を確定しない。

`amadeus-discovery` と phase 別公開入口（`amadeus-ideation`、`amadeus-inception`、`amadeus-construction`）は Issue #369 で退役した。
未確定の skill 名や旧コマンド名を前提にしない。

## Validation

`amadeus-validator` は、`.amadeus/` 配下のファイル更新を検知して自動起動しない。
`.amadeus/` 配下の成果物を作成または更新した場合は、作業後に明示的に実行する。
対象 Intent ディレクトリ名が分かる場合は、対象 Intent も指定して検証する。

構造検証は次で行う。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .
```

特定 Intent を含めて検証する場合は次で行う。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . <intent-id>-<slug>
```

Skill 昇格の確認は、必要に応じて `dev-scripts/promote-skill.ts` を使う。
昇格先に `evals/` や開発用ファイルを混ぜない。

## Development Rules

- 基準 branch は `main` として扱い、Git ブランチ戦略は [Git Branching Policy](.amadeus/steering/policies/git-branching.md) に従う。
- 古い成果物階層や旧コマンド群を、確認なしに戻さない。
- 不明な値は空欄にせず、`未確認` として記録する。
- 推測で外部システム、境界づけられたコンテキスト、Intent、依存関係を作らない。
- 実装や文書変更の前に、対象範囲と検証方法を明確にする。
