# Amadeus DLC

この文書は、エージェントがこのリポジトリで Amadeus を扱うときの共通入口である。
概要は [README.md](README.md) を参照する。
詳細な成果物契約は [docs/amadeus/lifecycle/](docs/amadeus/lifecycle/overview.md) と [docs/amadeus/steering.md](docs/amadeus/steering.md) を参照する。

## 作業言語

- 返答、仕様、調査メモ、検証結果は日本語で書く。
- 日本語の技術文書を書く、または推敲するときは `japanese-tech-writing` skill の規範に従う。
- 英語の識別子、ファイル名、コマンド名は必要な場合だけ使う。
- 機械可読・構造的成果物（`aidlc-state.md`、`intents.json`、audit イベント、改名対象のファイル名）は v2 の構造と英語ラベルをそのまま使う。
- Amadeus skill の `SKILL.md` と TS スクリプトは英語必須である（詳細は [Skill Language Policy](docs/amadeus/skill-language-policy.md) を参照）。
- `docs/amadeus/*.md` は英語を正とし、`*.ja.md` を日本語版として併置する。この対象は「返答、仕様、調査メモ、検証結果は日本語で書く」および「記述系成果物…日本語を維持する」の対象外である（詳細は [Language Policy](docs/amadeus/language-policy.md) を参照）。
- 記述系成果物（要求、設計、計画などの本文）とユーザー向け gate 文言は日本語を維持する。
- `aidlc/**/*.md`、テンプレートから生成される Markdown、`.kiro/specs/**/*.md`、`openspec/**/*.md` は日本語で書く。

## Project Context

### Paths

- Space: 対象 workspace の `aidlc/spaces/<space>/`（既定は `default`。`memory/`、`knowledge/`、`codekb/`、`intents/`）
- Intent record: `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`
- Skill sources: `skills/amadeus*/`
- Promoted skills: `.agents/skills/amadeus*/`

### Space

Space は、複数 Intent で共有する方法（`memory/`）、ドメイン知識（`knowledge/`）、コードベース知識（`codekb/`）、Intent の記録（`intents/`）を扱う。
このリポジトリの root `aidlc/` は、Amadeus 本体開発用の workspace である。

### Intent record

Intent record は、特定 Intent のライフサイクル成果物（各ステージの成果物、判断、追跡、`aidlc-state.md`、`audit/`）を扱う。
Intent の正準台帳は `intents/intents.json` である。
Intent の概要は `ideation/intent-capture/intent-statement.md` を参照する。
Intent モジュールファイル（`intents/<dirName>.md`）と `intents.md` 索引は廃止した（GD009）。
人間向け一覧が必要な場合は、`intents.json` から都度生成する。

## Skills

ライフサイクルの公開入口は `amadeus` の 1 個である。

`amadeus` はエンジン駆動である。
`.agents/amadeus/tools/amadeus-orchestrate.ts` の `next` / `report` を forwarding loop として呼び、エンジンが返す directive に従って 1 手ずつ実行し、結果を report してから次の `next` を呼ぶ。
scope 解決、Birth 判定、stage 順序、gate 判定、workflow 完了は、すべてエンジンが持ち、prose で再導出しない。

ステージ skill（`skills/amadeus-<phase>-<stage>/`、`skills/amadeus-<stage>/` など）は、上流 `awslabs/aidlc-workflows`（v2 ブランチ、基準 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26`）38 skill の適応コピーである。
適応点は、skill 名の `amadeus-*` への改名と、質問提示の `amadeus-grilling` プロトコルへの結線に限定する。
これらは単独実行用の stage runner（例: `/amadeus --stage code-generation --single`）であり、主実行経路はエンジンが持つ。
ステージ skill の一覧は [skills/amadeus/references/stage-catalog.md](skills/amadeus/references/stage-catalog.md) を参照する。
上流とのパリティは `npm run parity:check` で検査する。
Amadeus の成果物は、構造・意味論（状態機械、checkbox 語彙、audit イベント、英語ラベル）において上流 AI-DLC v2 と互換である。
名前空間（workspace ルート、状態ファイル名、コマンド名、内部マーカー）は Amadeus 固有であり、上流との名前対応は `dev-scripts/data/parity-map.json` の nameMappings が機械的に定義する（Issue #526）。

補助入口は次の 3 個である。

1. `amadeus-grilling`
2. `amadeus-domain-modeling`
3. `amadeus-validator`

Intake は、入力が既存 Intent のアウトカムに属する場合、新しい Intent を作らずスコープバックログへの合流を提案する。
新しい Intent は、人間の明示承認なしに作らない。
scope（bugfix、refactor など）が SKIP にするステージは実行しない。
Operation phase（4.1〜4.7）は、本家と同じ CONDITIONAL 実行対象として採用する。

Construction は Bolt を実行単位にし、walking skeleton の Bolt PR は必ず人間が承認する。
Construction では、Spec、`.kiro/specs/**`、`openspec/**` を作らない。

旧構造（`.amadeus/`、`state.json`、`<YYYYMMDD>-<slug>` 識別子）と旧公開入口は退役した（Issue #369、#387）。
未確定の skill 名や旧コマンド名を前提にしない。

## Validation

`amadeus-validator` は、`aidlc/` 配下のファイル更新を検知して自動起動しない。
`aidlc/` 配下の成果物を作成または更新した場合は、作業後に明示的に実行する。
対象 record の dirName が分かる場合は、対象 Intent も指定して検証する。

構造検証は次で行う。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .
```

特定 Intent を含めて検証する場合は次で行う。

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . <YYMMDD>-<label>
```

「実際に動く実行結果の検証」は、エンジン sandbox e2e（`npm run test:it:engine-e2e`）で行う。
sandbox e2e は決定論的であり、LLM を呼ばず、本番 `aidlc/` を変更しない。

Skill 昇格の確認は、必要に応じて `dev-scripts/promote-skill.ts` を使う。
昇格先に `evals/` や開発用ファイルを混ぜない。
Amadeus skill の言語方針は [Skill Language Policy](docs/amadeus/skill-language-policy.md) に従う。

## Development Rules

- 基準 branch は `main` として扱い、Git ブランチ戦略は `aidlc/spaces/default/memory/team.md` の働き方に従う。
- 後方互換維持対象は [docs/backward-compatibility.md](docs/backward-compatibility.md) に記載されたものだけとして扱う。
- 古い成果物階層や旧コマンド群を、確認なしに戻さない。
- 不明な値は空欄にせず、`未確認` として記録する。
- 推測で外部システム、境界づけられたコンテキスト、Intent、依存関係を作らない。
- 実装や文書変更の前に、対象範囲と検証方法を明確にする。
