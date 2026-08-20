# 開発者リファレンス概要

> 言語: [English](00-overview.md) | **日本語**

> [AI-DLC ドキュメント](../README.ja.md) の一部 · [ユーザーガイド](../guide/00-introduction.ja.md) · [ハーネスエンジニアガイド](../harness-engineering/00-overview.ja.md) · **開発者リファレンス**

このリファレンスは AI-DLC の内部アーキテクチャと実装を解説します。対象読者は、AI-DLC のコードベース自体 — オーケストレーター、フック、CLI ツール、ステージグラフのコンパイルパイプライン、監査タクソノミー、テストスイート — を変更するコントリビューターです。

AI-DLC を **使って** ソフトウェアを構築する場合は、まず [ユーザーガイド](../guide/00-introduction.ja.md) から読んでください。設定を通じて **AI-DLC の振る舞いを作り変える** 場合 — ステージやエージェントの追加、スコープの定義、ルールやセンサーの作成、チーム知識の追加 — は、まず [ハーネスエンジニアガイド](../harness-engineering/00-overview.ja.md) から読んでください。これらはコード変更ではなくデータ変更であり、そこの各章はワークフローを解説した上で、網羅的なスキーマについては本リファレンスへ案内します。

> **本リファレンスにおけるパス表記。** AI-DLC は一度だけ作成され、ハーネスごとに生成されます。そのため、ファイルは意図に応じて次の3つの命名規約のいずれかで表されます:
> - **`packages/framework/core/…`** — 手作業で作成する、ハーネス中立の **信頼できる情報源 (source of truth)**(例 `packages/framework/core/tools/amadeus-orchestrate.ts`、`packages/framework/core/amadeus-common/stages/`)。ここを編集します。
> - **`packages/framework/harness/<name>/…`** — 手作業で作成する、各ランタイム向けのハーネス固有サーフェス。
> - **`dist/<harness>/…`** — **生成されるが追跡されない**、使い捨てのローカルビルド出力(`dist/claude/.claude/`、`dist/kiro/.kiro/`、`dist/codex/`)。手編集せず `bun run build` で再生成します。公開配布物はリリース CI がクリーン checkout から構築するバージョン付き GitHub Release Asset です。
> - **`<harness-dir>/…`**(例 `.claude/`、`.kiro/`、`.codex/`)— *インストール済み* プロジェクト内部の **ランタイム** ロケーション。コマンドが実行され、ワークフロー中にフレームワークが読み書きする場所です(`bun .claude/tools/amadeus-graph.ts compile`、`.claude/agents/` を読む `loadAgents()`)。このディレクトリはハーネスのパラメータです。
>
> 本リファレンスが素の `.claude/` パスを示している箇所は、Claude ハーネス固有のランタイムロケーションと読み替えてください。同じファイルは `packages/framework/core/` または `packages/framework/harness/` で作成され、各ハーネス固有のディレクトリへ出荷されます。

## 本リファレンスの対象範囲

| 章 | トピック |
|---------|-------|
| [Architecture](01-architecture.ja.md) | 5層モデル、[Configuration layers](01-architecture.ja.md#configuration-layers) のルーティング原則、実行モデル、設計上の決定 |
| [ADR: プロジェクトディレクトリ解決順](adr/0001-project-dir-resolution-order.ja.md) | `CLAUDE_PROJECT_DIR` の優先順位と不一致診断に関する決定記録 |
| [Plane Architecture](02-plane-architecture.ja.md) | control / data / management プレーンの分離とその境界 |
| [Orchestrator](03-orchestrator.ja.md) | SKILL.md コンダクター: フォワーディングループ、ゲートの儀式、駆動する状態機械 |
| [Stage Protocol](04-stage-protocol.ja.md) | 振る舞いの契約: 承認ゲート、コンプライアンスチェックリスト |
| [Stages](04-stages/) | フェーズごとのステージドキュメント(5ファイル) |
| [Agent System](05-agent-system.ja.md) | エージェント構造、フロントマター契約、設定マトリクス |
| [Hooks and Tools](06-hooks-and-tools.ja.md) | フックシステム、CLI ツール、78イベントの監査タクソノミー |
| [Sensor System](07-sensor-system.ja.md) | センサーマニフェストのスキーマ、PULL インポート、発火モデル、デフォルト重大度 |
| [Rule System](08-rule-system.ja.md) | ルールファイルのレイアウト、スコープ導出、レイヤーチェーンのリゾルバ、コンフリクトゲート |
| [Testing](09-testing.ja.md) | テストピラミッド、階層、スタブ、フィクスチャ、テストレジストリ |
| [Knowledge System](10-knowledge-system.ja.md) | 2層アーキテクチャ、ロード順序、テンプレート |
| [Contributing](11-contributing.ja.md) | 開発ワークフロー、ユーティリティハンドラのチェックリスト、ドキュメントポリシー |
| [State Machine](12-state-machine.ja.md) | ワークフロー / フェーズ / ステージの各状態機械、78イベントタクソノミー、監査ファーストのルール |
| [Runtime Graph](13-runtime-graph.ja.md) | コンパイルされた `runtime-graph.json` 成果物: ステージグラフのデータプレーンミラー |
| [Harness Primitives Mapping](14-claude-features.ja.md) | 各 AI-DLC 概念がハーネスのネイティブプリミティブへどうマッピングされるか(Claude Code を詳細に) |
| [Stage Definition](15-stage-definition.ja.md) | YAML フロントマター契約、3区画ボディ、コンパイルパイプライン |
| [Artifact Vocabulary](16-artifact-vocabulary.ja.md) | 命名ルール、衝突ポリシー、ファイルシステムマッピング、ライブレジストリの閲覧方法 |
| [Engine and Skill System](17-skill-system.ja.md) | オーケストレーションエンジン(`next`/`report`)、型付きディレクティブ契約、コンダクター、複数スキル、スコープの形、スワームレフェリー |
| [Workspace Layout Decision](18-workspace-layout.ja.md) | Issue #610 のリポジトリレイアウト決定: framework source を `packages/framework/` へ移し、root の `scripts/` と `dist/` は維持する |
| [階層設定リゾルバー](19-layered-config.ja.md) | Global → Space → Intent の解決、スキーマ検証、フェーズ境界との統合 |
| [Intent Mirror リファレンス](20-intent-mirror.ja.md) | Intent Mirror の runtime と配布 contract |
| [形式モデルを実装に追従させる](21-formal-model-following.ja.md) | `model-completeness` の drift シグナルの読み方と、実装 hash 更新 / モデル改訂の分岐 |
| [形式モデルを供給する](22-formal-model-supply.ja.md) | 新規並行プロトコルへの TLA+ モデル追加: 題材選定・縮約申告・登録・落ちる実証・空文化ガード |
| [Depth 制御アーキテクチャ](25-depth-control-architecture.ja.md) | L0〜L5 の depth 制御点マップ、層別の目標強制度、blocking 化の総量規制、着手順 |
| [ライフサイクル Guard Runtime](26-lifecycle-guard-runtime.ja.md) | Intent 生成・ステージ完了・Phase 遷移・Workflow 完了に共通する Guard Interface: verdict 語彙、Adapter レジストリ、fail-closed 集約、G1〜G40 のガード棚卸し |
| [Diagrams](diagrams.ja.md) | すべての Mermaid 図を一箇所に集約 |
| [Agents](agents/) | 技術的なエージェントリファレンス(フロントマター、ツーリング、ステージ所有権) |

## ナビゲーション方法

- **新しい関心事(ルール、方法論、知識事実)はどこに属するか?** [Architecture: Configuration layers](01-architecture.ja.md#configuration-layers) を読んでください — 2軸モデル(authorship × consumption)と境界テストにより、あらゆる新しい関心事が正しいファイルへルーティングされます。
- **新しいステージを追加する?** [Stage Protocol](04-stage-protocol.ja.md) を読み、次に [Stages](04-stages/) の該当フェーズファイル、そして [Contributing](11-contributing.ja.md) を読んでください。
- **ステージ定義フォーマットを変更する?** どのステージ `.md` ファイルを編集する前にも [Stage Definition](15-stage-definition.ja.md) を読んでください。ステージファイルフォーマットはデータ駆動で、ランタイムはコンパイル済み JSON を読みます。
- **成果物を追加・リネームする?** [Artifact Vocabulary](16-artifact-vocabulary.ja.md) を読んでください — この章は命名ルール、安定性ポリシー(リネーム/削除 = メジャー、追加 = マイナー)を説明し、ライブリストについては `bun amadeus-graph.ts artifacts` を案内します。レジストリはステージファイルから導出され、手書きではありません。
- **新しいスコープを追加する?** [Contributing: Adding a Scope](11-contributing.ja.md#adding-a-scope) を読んでください。スコープはファイルで作成されます — `.claude/scopes/amadeus-<name>.md` ファイルと各メンバーステージ上の `scopes:` タグで、TypeScript 編集は不要です。
- **新しいエージェントを追加する?** [Contributing: Adding an Agent](11-contributing.ja.md#adding-an-agent) を読んでください。エージェントは `.md` フロントマターでデータ駆動され、TypeScript 編集は不要です。
- **エージェントを変更する?** [Agent System](05-agent-system.ja.md) と [Agents](agents/) のそのエージェントのファイルを読んでください。
- **フックに取り組む?** [Hooks and Tools](06-hooks-and-tools.ja.md) と、フックのテストパターンについて [Testing](09-testing.ja.md) を読んでください。
- **オーケストレーターを変更する?** [Orchestrator](03-orchestrator.ja.md) と [Architecture](01-architecture.ja.md) を読んでください。監査イベントを追加・変更する場合は、[State Machine](12-state-machine.ja.md) の章から始めてください — 対応しないと、ドリフトテストがあなたを捕まえます。

## ユーザーガイドとの関係

ユーザーガイド(`docs/guide/`)は AI-DLC が **何をするか** と **どう使うか** を説明します。この開発者リファレンスは **どう動くか** と **どう変更するか** を説明します。一部のトピックは両方に登場します:

| トピック | ユーザーガイド | 開発者リファレンス |
|-------|-----------|-------------------|
| エージェント | 何をするか、いつ現れるか | フロントマター契約、追加/変更方法 |
| 知識 | 会社標準の追加方法 | ロード順序の内部、テンプレートシステム |
| フック | 何がログされるか | フック実装、監査イベントタクソノミー |
