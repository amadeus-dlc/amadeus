# Amadeus

Amadeus は、AI と人間が協調してソフトウェア開発を進める Amadeus DLC を運用するためのプロジェクトです。
Amadeus は、AI-DLC v2 と意味論互換のライフサイクル（Initialization、Ideation、Inception、Construction、Operation）を進めるための agent skill、template、validator、ドキュメントを提供します。

[English](README.md) | [日本語](README.ja.md)

## Highlights

- 単一の公開入口 skill `amadeus` がライフサイクル全体を扱います。Intake（合流既定、人間承認付きの Intent Birth、scope 推定）を行い、エンジン駆動で動きます。エンジン（`amadeus-orchestrate.ts` の `next` / `report` forwarding loop）が次ステージを解決し、ステージ skill へ 1 手ずつ委譲します。
- scope（`enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`、`pdm`）ごとに、32 ステージのうち実行対象だけを実行し、儀式量を作業に合わせて縮退します。
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

標準検証一式を実行します。

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
エンジン駆動で動き、エンジンが次ステージを解決してステージ内部 skill へ 1 手ずつ委譲します。ステージ順序を prose で再導出することはありません。

### 補助入口

補助入口は、追加分析、ドメイン確認、成果物検証が必要な場合に使います。

- `amadeus-grilling`
- `amadeus-domain-modeling`
- `amadeus-validator`

### 内部スキル

内部スキルは、`amadeus` のステージルーティングまたは他の skill から使う実装補助です。
明示的に内部スキルが必要な作業でない場合は、`amadeus` または補助入口を公開入口として使います。

| family | 内部 skill |
|---|---|
| ステージ実行 skill（ライフサイクル各ステージに 1 個、`amadeus-<stage>`、29 個） | エンジンから呼ばれる、または単独実行する 1 ステージ分のパッケージ。全ステージ対応表は [skills/amadeus/references/stage-catalog.md](skills/amadeus/references/stage-catalog.md) を参照します。 |
| scope / composer shortcut | `amadeus-bugfix`、`amadeus-feature`、`amadeus-mvp`、`amadeus-security-patch`、`amadeus-init`、`amadeus-compose` |
| 読み取り専用ユーティリティ | `amadeus-outcomes-pack`、`amadeus-replay`、`amadeus-session-cost` |

Amadeus の source を変更する場合は、`skills/amadeus-*` と `.agents/skills/amadeus-*` の両方を確認し、昇格先成果物はリポジトリの昇格手順でそろえます。

このリポジトリでは、root `amadeus/` を Amadeus 本体開発用の workspace として扱います。

### Typical Flow

| 手順 | skill | 目的 |
|---|---|---|
| 1 | `amadeus` | 入力の Intake を行います。既存 Intent への継続または合流を既定にし、新しいアウトカムだけを scope 推定付きの Birth 提案として人間に確認します。 |
| 2 | `amadeus` | 以降のセッションでエンジン駆動により次ステージを解決し、Ideation、Inception、Construction のステージ内部 skill へ委譲します。Construction は Bolt 単位で進め、walking skeleton は必ず人間が承認します。 |

補助入口は、必要に応じて flow と併用します。
`amadeus-grilling` は Intent、steering、ドメイン、設計境界、実行方針を一問ずつの質問で確認します。
`amadeus-domain-modeling` は用語、ユビキタス言語、ドメイン境界を確定し、確定内容を workspace の knowledge 成果物へ記録します。
`amadeus-validator` は workspace と Intent の成果物構造を検証します。

### Validation

validator を workspace に対して実行します。

```sh
npm run validate:workspace -- <workspace>
```

validator を特定 Intent に対して実行します。

```sh
npm run validate:workspace -- <workspace> <YYMMDD>-<label>
```

## Documentation

- agent 共通入口: [AMADEUS.md](AMADEUS.md)
- 利用者ガイド: [docs/guide/index.ja.md](docs/guide/index.ja.md)
- skill 言語方針: [docs/amadeus/skill-language-policy.ja.md](docs/amadeus/skill-language-policy.ja.md)
- `docs/amadeus/` の言語方針: [docs/amadeus/language-policy.ja.md](docs/amadeus/language-policy.ja.md)
- ライフサイクル契約（5 phase 32 ステージ、scope、state スキーマ）:
  - [Overview](docs/amadeus/lifecycle/overview.md)
  - [Scopes](docs/amadeus/lifecycle/scopes.md)
  - [Ideation](docs/amadeus/lifecycle/ideation.md)
  - [Inception](docs/amadeus/lifecycle/inception.md)
  - [Construction](docs/amadeus/lifecycle/construction.md)
  - [State](docs/amadeus/lifecycle/state.md)
- Space reference: [docs/amadeus/steering.ja.md](docs/amadeus/steering.ja.md)
- 拡張ガイド: [docs/amadeus/extension-guide.ja.md](docs/amadeus/extension-guide.ja.md)
- Architecture Decision: [docs/adr/](docs/adr/)
- AI-DLC 参照資料: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `amadeus/` は対象 workspace の成果物ルートです。
  このリポジトリ root では、Amadeus 本体開発用の workspace に限定して扱います。
- Space（既定は `amadeus/spaces/default/`）は、`memory/`、`knowledge/`、`codekb/`、`intents/` を持ちます。
- 正準台帳は `amadeus/spaces/<space>/intents/intents.json`（UUIDv7）です。Intent ディレクトリ名は `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` に従います。
- 新しい Intent は `amadeus` の Intake から人間の明示承認を経てだけ生まれます。既存 Intent のアウトカムに属する作業は、新しい Intent にせず対象 Intent のスコープバックログへ合流させます。
- ドメイン上の発見は範囲に応じて置き分けます。
  対象 Intent の `domain-notes.md`、`amadeus/spaces/<space>/knowledge/domain-map.md`、`amadeus/spaces/<space>/knowledge/context-map.md`、`inception/traceability.md`、Construction の Functional Design を使い分けます。
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
