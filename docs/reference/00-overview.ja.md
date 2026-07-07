# 開発者リファレンス概要

> [AI-DLC ドキュメント](../README.md) の一部 · [ユーザーガイド](../guide/00-introduction.md) · [ハーネスエンジニアガイド](../harness-engineering/00-overview.md) · **開発者リファレンス**

このリファレンスは AI-DLC の内部アーキテクチャと実装を解説します。対象読者は、AI-DLC のコードベース自体 — オーケストレーター、フック、CLI ツール、ステージグラフのコンパイルパイプライン、監査タクソノミー、テストスイート — を変更するコントリビューターです。

AI-DLC を **使って** ソフトウェアを構築する場合は、まず [ユーザーガイド](../guide/00-introduction.md) から読んでください。設定を通じて **AI-DLC の振る舞いを作り変える** 場合 — ステージやエージェントの追加、スコープの定義、ルールやセンサーの作成、チーム知識の追加 — は、まず [ハーネスエンジニアガイド](../harness-engineering/00-overview.md) から読んでください。これらはコード変更ではなくデータ変更であり、そこの各章はワークフローを解説した上で、網羅的なスキーマについては本リファレンスへ案内します。

> **本リファレンスにおけるパス表記。** AI-DLC は一度だけ作成され、ハーネスごとに生成されます。そのため、ファイルは意図に応じて次の3つの命名規約のいずれかで表されます:
> - **`core/…`** — 手作業で作成する、ハーネス中立の **信頼できる情報源 (source of truth)**(例 `core/tools/amadeus-orchestrate.ts`、`core/amadeus-common/stages/`)。ここを編集します。ファイルが *作成される* または *変更される* 場所を指すパスは `core/` パスです。
> - **`dist/<harness>/…`** — **生成され、コミットされ、ドリフトガードされる** 配布物(`dist/claude/.claude/`、`dist/kiro/.kiro/`、`dist/codex/`)。手編集は禁止。`bun scripts/package.ts` によってバイト単位で再現されます。*出荷される* ものを説明する場合にのみ引用されます。
> - **`<harness-dir>/…`**(例 `.claude/`、`.kiro/`、`.codex/`)— *インストール済み* プロジェクト内部の **ランタイム** ロケーション。コマンドが実行され、ワークフロー中にフレームワークが読み書きする場所です(`bun .claude/tools/amadeus-graph.ts compile`、`.claude/agents/` を読む `loadAgents()`)。このディレクトリはハーネスのパラメータです。
>
> 本リファレンスが素の `.claude/` パスを示している箇所は、Claude ハーネス固有のランタイムロケーションと読み替えてください。同じファイルは `core/` で作成され、各ハーネス固有のディレクトリへ出荷されます。

## 本リファレンスの対象範囲

| 章 | トピック |
|---------|-------|
| [Architecture](01-architecture.md) | 5層モデル、[Configuration layers](01-architecture.md#configuration-layers) のルーティング原則、実行モデル、設計上の決定 |
| [Plane Architecture](02-plane-architecture.md) | control / data / management プレーンの分離とその境界 |
| [Orchestrator](03-orchestrator.md) | SKILL.md コンダクター: フォワーディングループ、ゲートの儀式、駆動する状態機械 |
| [Stage Protocol](04-stage-protocol.md) | 振る舞いの契約: 承認ゲート、コンプライアンスチェックリスト |
| [Stages](04-stages/) | フェーズごとのステージドキュメント(5ファイル) |
| [Agent System](05-agent-system.md) | エージェント構造、フロントマター契約、設定マトリクス |
| [Hooks and Tools](06-hooks-and-tools.md) | フックシステム、CLI ツール、68イベントの監査タクソノミー |
| [Sensor System](07-sensor-system.md) | センサーマニフェストのスキーマ、PULL インポート、発火モデル、デフォルト重大度 |
| [Rule System](08-rule-system.md) | ルールファイルのレイアウト、スコープ導出、レイヤーチェーンのリゾルバ、コンフリクトゲート |
| [Testing](09-testing.md) | テストピラミッド、階層、スタブ、フィクスチャ、テストレジストリ |
| [Knowledge System](10-knowledge-system.md) | 2層アーキテクチャ、ロード順序、テンプレート |
| [Contributing](11-contributing.md) | 開発ワークフロー、ユーティリティハンドラのチェックリスト、ドキュメントポリシー |
| [State Machine](12-state-machine.md) | ワークフロー / フェーズ / ステージの各状態機械、68イベントタクソノミー、監査ファーストのルール |
| [Runtime Graph](13-runtime-graph.md) | コンパイルされた `runtime-graph.json` 成果物: ステージグラフのデータプレーンミラー |
| [Harness Primitives Mapping](14-claude-features.md) | 各 AI-DLC 概念がハーネスのネイティブプリミティブへどうマッピングされるか(Claude Code を詳細に) |
| [Stage Definition](15-stage-definition.md) | YAML フロントマター契約、3区画ボディ、コンパイルパイプライン |
| [Artifact Vocabulary](16-artifact-vocabulary.md) | 命名ルール、衝突ポリシー、ファイルシステムマッピング、ライブレジストリの閲覧方法 |
| [Engine and Skill System](17-skill-system.md) | オーケストレーションエンジン(`next`/`report`)、型付きディレクティブ契約、コンダクター、複数スキル、スコープの形、スワームレフェリー |
| [Diagrams](diagrams.md) | すべての Mermaid 図を一箇所に集約 |
| [Agents](agents/) | 技術的なエージェントリファレンス(フロントマター、ツーリング、ステージ所有権) |

## ナビゲーション方法

- **新しい関心事(ルール、方法論、知識事実)はどこに属するか?** [Architecture: Configuration layers](01-architecture.md#configuration-layers) を読んでください — 2軸モデル(authorship × consumption)と境界テストにより、あらゆる新しい関心事が正しいファイルへルーティングされます。
- **新しいステージを追加する?** [Stage Protocol](04-stage-protocol.md) を読み、次に [Stages](04-stages/) の該当フェーズファイル、そして [Contributing](11-contributing.md) を読んでください。
- **ステージ定義フォーマットを変更する?** どのステージ `.md` ファイルを編集する前にも [Stage Definition](15-stage-definition.md) を読んでください。ステージファイルフォーマットはデータ駆動で、ランタイムはコンパイル済み JSON を読みます。
- **成果物を追加・リネームする?** [Artifact Vocabulary](16-artifact-vocabulary.md) を読んでください — この章は命名ルール、安定性ポリシー(リネーム/削除 = メジャー、追加 = マイナー)を説明し、ライブリストについては `bun amadeus-graph.ts artifacts` を案内します。レジストリはステージファイルから導出され、手書きではありません。
- **新しいスコープを追加する?** [Contributing: Adding a Scope](11-contributing.md#adding-a-scope) を読んでください。スコープはファイルで作成されます — `.claude/scopes/amadeus-<name>.md` ファイルと各メンバーステージ上の `scopes:` タグで、TypeScript 編集は不要です。
- **新しいエージェントを追加する?** [Contributing: Adding an Agent](11-contributing.md#adding-an-agent) を読んでください。エージェントは `.md` フロントマターでデータ駆動され、TypeScript 編集は不要です。
- **エージェントを変更する?** [Agent System](05-agent-system.md) と [Agents](agents/) のそのエージェントのファイルを読んでください。
- **フックに取り組む?** [Hooks and Tools](06-hooks-and-tools.md) と、フックのテストパターンについて [Testing](09-testing.md) を読んでください。
- **オーケストレーターを変更する?** [Orchestrator](03-orchestrator.md) と [Architecture](01-architecture.md) を読んでください。監査イベントを追加・変更する場合は、[State Machine](12-state-machine.md) の章から始めてください — 対応しないと、ドリフトテストがあなたを捕まえます。

## ユーザーガイドとの関係

ユーザーガイド(`docs/guide/`)は AI-DLC が **何をするか** と **どう使うか** を説明します。この開発者リファレンスは **どう動くか** と **どう変更するか** を説明します。一部のトピックは両方に登場します:

| トピック | ユーザーガイド | 開発者リファレンス |
|-------|-----------|-------------------|
| エージェント | 何をするか、いつ現れるか | フロントマター契約、追加/変更方法 |
| 知識 | 会社標準の追加方法 | ロード順序の内部、テンプレートシステム |
| フック | 何がログされるか | フック実装、監査イベントタクソノミー |
