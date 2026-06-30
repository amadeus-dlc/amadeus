# Amadeus

Amadeus は、AI と人間が協調してソフトウェア開発を進める Amadeus DLC を運用するためのプロジェクトです。
Amadeus は、Ideation、Inception、Construction、補助分析を進めるための agent skill、template、example、validator、ドキュメントを提供します。

[English](README.md) | [日本語](README.ja.md)

## Highlights

- `amadeus-steering`、`amadeus-ideation`、`amadeus-inception`、`amadeus-construction` などの目的別 skill で Amadeus DLC を進めます。
- phase state、gate、traceability、decisions、検証結果を明示し、成果物を監査しやすくします。
- [examples/](examples/) 配下の生成例を、skill が生成できる snapshot として参照できます。
- 同梱の `amadeus-validator` で Amadeus workspace と Intent 成果物を検証できます。

## Quickstart

### Requirements

- Node.js と npm。
- Bun。
- [package.json](package.json) に定義された依存。

### Install

```sh
bun install
```

### Run

同梱 example を検証します。

```sh
npm run validate:all
```

mock provider を使う標準検証を実行します。

```sh
npm run test:all
```

## Usage

Amadeus は agent skill を通じて使います。
現時点で対応している公開入口は次の 10 個です。

1. `amadeus-steering`
2. `amadeus-discovery`
3. `amadeus-event-storming`
4. `amadeus-ideation`
5. `amadeus-inception`
6. `amadeus-construction`
7. `amadeus-grilling`
8. `amadeus-domain-modeling`
9. `amadeus-domain-grilling`
10. `amadeus-validator`

このリポジトリでは、root `.amadeus/` を作業中の状態として置きません。
リポジトリ内の生成例は [examples/](examples/) 配下の段階別 snapshot として管理します。

### Typical Flow

| 手順 | skill | 目的 |
|---|---|---|
| 1 | `amadeus-steering` | workspace の共有土台を作成または点検します。 |
| 2 | `amadeus-discovery` | 大きい入力テーマ、曖昧な入力テーマ、既存 Intent との関係が不明な入力テーマを Intent 化前に整理します。 |
| 3 | `amadeus-event-storming` | Domain Event、Process、Aggregate Candidate、Bounded Context Candidate、Hotspot を補助分析として整理します。 |
| 4 | `amadeus-ideation` | Intent Record を作り、Ideation 成果物を完了状態へ進めます。 |
| 5 | `amadeus-inception` | Requirement、受け入れ状態、User Story、Use Case、Unit、Bolt、Unit Design Brief、traceability、decision を定義します。 |
| 6 | `amadeus-construction` | Bolt を Task に分解し、実装、検証、証拠化、traceability 更新まで進めます。 |
| 7 | `amadeus-grilling` | 設計や計画の曖昧な論点を一問ずつ解消します。 |
| 8 | `amadeus-domain-modeling` | 用語、概念、モデル、契約を phase 横断で整理します。 |
| 9 | `amadeus-domain-grilling` | 質問によるドメイン確認と成果物更新を組み合わせます。 |
| 10 | `amadeus-validator` | workspace と Intent の成果物構造を検証します。 |

### Validation

workspace 単位の example 成果物だけを検証します。

```sh
npm run validate
```

Intent 単位の example 成果物を検証します。

```sh
npm run validate:intents
```

example wrapper の対象をすべて検証します。

```sh
npm run validate:all
```

validator を workspace に対して直接実行します。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

validator を特定 Intent に対して直接実行します。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> <intent-id>-<slug>
```

## Documentation

- agent 共通入口: [AMADEUS.md](AMADEUS.md)
- 生成例: [examples/](examples/)
- Stage reference:
  - [Steering](docs/amadeus/stages/steering.md)
  - [Discovery](docs/amadeus/stages/discovery.md)
  - [Ideation](docs/amadeus/stages/ideation.md)
  - [Inception](docs/amadeus/stages/inception.md)
  - [Construction](docs/amadeus/stages/construction.md)
  - [Operation](docs/amadeus/stages/operation.md)
- Architecture Decision: [docs/adr/](docs/adr/)
- AI-DLC 参照資料: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `.amadeus/` は対象 workspace の成果物ルートであり、このリポジトリ root の作業状態ではありません。
- Intent ディレクトリ名は `.amadeus/intents.md` と `.amadeus/intents/<intent-id>-<slug>/` で一致させます。
- ドメイン上の発見は範囲に応じて置き分けます。
  対象 Intent の `domain-notes.md`、`.amadeus/domain/**`、`inception/traceability.md`、Construction の Functional Design を使い分けます。
- 不明な値は空欄にせず、`未確認` と記録します。
- 外部システム、Bounded Context、Intent、依存関係を推測で作りません。
- Spec、`.kiro/specs/**`、`openspec/**`、Operation 成果物は、対応 skill が確定するまで手順として固定しません。

## Getting Help

- Issues: [github.com/j5ik2o/amadeus/issues](https://github.com/j5ik2o/amadeus/issues)

## Contributing

このリポジトリには、現時点で `CONTRIBUTING.md` がありません。
大きな変更を始める前に、対象範囲、影響する skill、期待する成果物、検証計画を GitHub Issue に記録してください。

ローカル開発では次を使います。

```sh
npm run test:all
```

## License

このリポジトリには、現時点で license file が含まれていません。
