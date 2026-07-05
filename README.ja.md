# Amadeus

Amadeus は、AI と人間が協調してソフトウェア開発を進める Amadeus DLC を運用するためのプロジェクトです。
Amadeus は、AI-DLC v2 と意味論互換のライフサイクル（Ideation、Inception、Construction）と補助分析を進めるための agent skill、template、validator、ドキュメントを提供します。

[English](README.md) | [日本語](README.ja.md)

## Highlights

- 単一の公開入口 skill `amadeus` がライフサイクル全体を扱います。Intake（合流既定、人間承認付きの Intent Birth、scope 推定）と、`aidlc-state.md` に基づくステージルーティングを行います。
- scope（`enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`）ごとに、22 ステージのうち実行対象だけを実行し、儀式量を作業に合わせて縮退します。
- [examples/](examples/) 配下の生成例を、skill が生成できる snapshot として参照できます。
- ステージ状態、approval evidence、phase gate、Bolt gate、検証結果を明示し、成果物を監査しやすくします。
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

mock provider を使う標準検証を実行します。

```sh
npm run test:all
```

## 利用者向け導入手順

この節は、自分の対象 workspace（このリポジトリ自身の開発用ではない、利用者のプロジェクト）へ Amadeus エンジンを導入する手順です。上の [Quickstart](#quickstart) は Amadeus 本体を開発するための手順であり、対象が異なります。

### 前提

- [Bun](https://bun.sh)。

### 導入コマンド

このリポジトリの clone から、導入先の workspace を指定して実行します。

```sh
bun run scripts/amadeus-install.ts --target <workspace>
```

または次でも同じです。

```sh
npm run amadeus:install -- --target <workspace>
```

### インストール内容

- エンジン本体 `.agents/amadeus/`（7 dir: `agents`、`amadeus-common`、`hooks`、`knowledge`、`scopes`、`sensors`、`tools`）。
- `amadeus*` skills（`.claude/skills/` と `.agents/skills/` の両方）。
- `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}`（`.agents/amadeus/` への相対 symlink）。
- workspace root の `AMADEUS.md`（利用者向けに変換済み。本体開発専用の節は除去）。
- `.claude/settings.json` への Amadeus hooks 配線のマージ（`env`、`permissions`、他ツールの hooks など既存内容には触れません）。

Codex 利用者は `.claude/` 側の配線が不要です。`.agents/` 単体で導入が完結します。

### 導入後の検証

```sh
bun <workspace>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <workspace>
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

### 更新

更新は同じコマンドを同じ workspace に対して再実行するだけです。冪等であり、置換対象は同じ結果へ収束し、hooks のマージも重複を生みません。

## Usage

Amadeus は agent skill を通じて使います。
skill は Amadeus DLC への関わり方で分類します。

### ライフサイクル入口

`amadeus` がライフサイクルの単一公開入口です。

入力が既存 Intent の継続か、既存 Intent のスコープバックログへの合流か、新しい Intent の Birth 提案（必ず人間の承認を要する）かを判定します。
その後、対象 Intent の `aidlc-state.md` から次のステージを解決し、ステージ内部 skill へ委譲します。

1. `amadeus-steering`（workspace の共有土台。workspace ごとに最初に一度）
2. `amadeus`（すべての Intent の Intake とステージルーティング）

### 補助入口

補助入口は、追加分析、ドメイン確認、成果物検証が必要な場合に使います。

- `amadeus-event-storming`
- `amadeus-grilling`
- `amadeus-domain-modeling`
- `amadeus-domain-grilling`
- `amadeus-validator`

### 内部スキル

内部スキルは、`amadeus` のステージルーティングまたは他の skill から使う実装補助です。
明示的に内部スキルが必要な作業でない場合は、`amadeus` または補助入口を公開入口として使います。

| family | 内部 skill |
|---|---|
| Ideation ステージ（1.1〜1.7） | `amadeus-ideation-intent-capture`、`amadeus-ideation-market-research`、`amadeus-ideation-feasibility`、`amadeus-ideation-scope-definition`、`amadeus-ideation-team-formation`、`amadeus-ideation-rough-mockups`、`amadeus-ideation-approval-handoff` |
| Inception ステージ（2.1〜2.8） | `amadeus-inception-reverse-engineering`、`amadeus-inception-practices-discovery`、`amadeus-inception-requirements-analysis`、`amadeus-inception-user-stories`、`amadeus-inception-refined-mockups`、`amadeus-inception-application-design`、`amadeus-inception-units-generation`、`amadeus-inception-delivery-planning` |
| Construction ステージ（3.1〜3.7） | `amadeus-construction-functional-design`、`amadeus-construction-nfr-requirements`、`amadeus-construction-nfr-design`、`amadeus-construction-infrastructure-design`、`amadeus-construction-code-generation`、`amadeus-construction-build-and-test`、`amadeus-construction-ci-pipeline` |
| 判断と学習支援 | `amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` |

Amadeus skill を確認または変更するときは、必ず `skill-forge` で skill 境界、trigger description、本文指示、eval coverage、存在する場合は Codex metadata を確認します。
skill 変更 PR では、この確認と結果の PR 説明への記録が必須条件です。定義は team memory（[aidlc/spaces/default/memory/team.md](aidlc/spaces/default/memory/team.md)）の判断基準にあります。
Amadeus の source を変更する場合は、`skills/amadeus-*` と `.agents/skills/amadeus-*` の両方を確認し、昇格先成果物はリポジトリの昇格手順でそろえます。

このリポジトリでは、root `aidlc/` を Amadeus 本体開発用の workspace として扱います。

### Typical Flow

| 手順 | skill | 目的 |
|---|---|---|
| 1 | `amadeus-steering` | workspace の共有土台を作成または点検します。 |
| 2 | `amadeus` | 入力の Intake を行います。既存 Intent への継続または合流を既定にし、新しいアウトカムだけを scope 推定付きの Birth 提案として人間に確認します。 |
| 3 | `amadeus` | 以降のセッションで `aidlc-state.md` から次ステージを解決し、Ideation、Inception、Construction のステージ内部 skill へ委譲します。Construction は Bolt 単位で進め、walking skeleton は必ず人間が承認します。 |

補助入口は、必要に応じて flow と併用します。
`amadeus-event-storming` は Domain Event、Process、Aggregate Candidate、Bounded Context Candidate、Hotspot を補助分析として整理します。
`amadeus-domain-grilling` は質問によるドメイン確認と成果物更新を組み合わせます。
`amadeus-validator` は workspace と Intent の成果物構造を検証します。

### Validation

同梱の example snapshot を検証します。

```sh
npm run validate:all
```

validator を workspace に対して直接実行します。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

validator を特定 Intent に対して直接実行します。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> <YYMMDD>-<label>
```

## Documentation

- agent 共通入口: [AMADEUS.md](AMADEUS.md)
- skill 言語方針: [docs/amadeus/skill-language-policy.md](docs/amadeus/skill-language-policy.md)
- 生成例: [examples/](examples/)
- ライフサイクル契約（3 phase 22 ステージ、scope、state スキーマ）:
  - [Overview](docs/amadeus/lifecycle/overview.md)
  - [Scopes](docs/amadeus/lifecycle/scopes.md)
  - [Ideation](docs/amadeus/lifecycle/ideation.md)
  - [Inception](docs/amadeus/lifecycle/inception.md)
  - [Construction](docs/amadeus/lifecycle/construction.md)
  - [State](docs/amadeus/lifecycle/state.md)
- Space reference: [docs/amadeus/steering.md](docs/amadeus/steering.md)
- Architecture Decision: [docs/adr/](docs/adr/)
- AI-DLC 参照資料: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `aidlc/` は対象 workspace の成果物ルートです。
  このリポジトリ root では、Amadeus 本体開発用の workspace に限定して扱います。
- Space（既定は `aidlc/spaces/default/`）は、`memory/`、`knowledge/`、`codekb/`、`intents/` を持ちます。
- Intent ディレクトリ名は `aidlc/spaces/<space>/intents/intents.md` と `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` で一致させます。
- 新しい Intent は `amadeus` の Intake から人間の明示承認を経てだけ生まれます。既存 Intent のアウトカムに属する作業は、新しい Intent にせず対象 Intent のスコープバックログへ合流させます。
- ドメイン上の発見は範囲に応じて置き分けます。
  対象 Intent の `domain-notes.md`、`aidlc/spaces/<space>/knowledge/domain-map.md`、`aidlc/spaces/<space>/knowledge/context-map.md`、`inception/traceability.md`、Construction の Functional Design を使い分けます。
- 不明な値は空欄にせず、`未確認` と記録します。
- 外部システム、Bounded Context、Intent、依存関係を推測で作りません。
- Spec、`.kiro/specs/**`、`openspec/**`、Operation 成果物は、対応 skill が確定するまで手順として固定しません。

## Getting Help

- Issues: [github.com/amadeus-dlc/amadeus/issues](https://github.com/amadeus-dlc/amadeus/issues)

## Contributing

貢献のライセンス条件、DCO の sign-off、進め方は [CONTRIBUTING.ja.md](CONTRIBUTING.ja.md) を参照してください。
大きな変更を始める前に、対象範囲、影響する skill、期待する成果物、検証計画を GitHub Issue に記録してください。

ローカル開発では次を使います。

```sh
npm run test:all
```

## License

このリポジトリは MIT OR Apache-2.0 のデュアルライセンスです。
詳細は [LICENSE-MIT](LICENSE-MIT) と [LICENSE-APACHE](LICENSE-APACHE) を参照してください。

明示的に別の条件を示さない限り、Apache-2.0 ライセンスの定義に従ってこのプロジェクトへ意図的に提出された貢献は、追加の条件なしに上記のデュアルライセンスで提供されたものとみなします。
