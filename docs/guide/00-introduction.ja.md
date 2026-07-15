# はじめに

> 言語: [English](00-introduction.md) | **日本語**

> [AI-DLC ドキュメント](../README.ja.md)の一部 · **User Guide** · [Harness Engineer Guide](../harness-engineering/00-overview.ja.md) · [Developer Reference](../reference/00-overview.ja.md)

## AI-DLC とは?

AI-DLC(AI-Driven Development Life Cycle)は、AI 支援によるソフトウェア開発を、再現可能でトレース可能なフェーズへと構造化するための方法論です。これは [AWS の AI-DLC 方法論](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)に由来します。このリポジトリは、ハーネス非依存の単一の core からそれをネイティブに実装しているため、あなたがすでに使っている CLI ハーネス内で動作します — 現時点では Claude Code、Kiro CLI、Kiro IDE、Codex CLI です。このガイドはハーネス非依存です。ハーネスによって詳細が異なる箇所ではその旨を記し、あなたのハーネスの章([Running on other harnesses](harnesses/README.ja.md) を参照)を案内します。特に断りがない限り、例は Claude Code で示します。

単一のコマンドで呼び出します:

```
/amadeus Build a REST API for inventory management
```

そして AI-DLC は、意図の把握から、要求、設計、実装、テスト、デプロイまで、構造化されたワークフローをあなたに案内します — その間、あらゆる意思決定ポイントであなたが主導権を握り続けます。

## 哲学: 小さなモブ、広いエージェント

数十の狭い専門家(ウォーターフォールの引き継ぎ連鎖を再現してしまうアプローチ)ではなく、AI-DLC は **広い能力を持つ 11 のエージェント** を使います。各エージェントは複数のステージとフェーズにまたがって参加します。各エージェントがステージ間で文脈を持ち運ぶため、引き継ぎがなくなり、調整のオーバーヘッドが減ります。

これは、効果的な人間のチームの働き方を反映しています: 3〜5 人のモブが 1 つの機能全体をカバーし、それぞれが単一の狭い専門性ではなく広いスキルを持ち寄ります。

## オーケストレーターの仕組み

その中核で、AI-DLC はシンプルなループを回します。決定論的な **エンジン** が次に何が起きるかを決め、**コンダクター**(`/amadeus` セッション、`SKILL.md`)がそれを実行し、次の一手をエンジンに尋ねます。このループを通じて、フレームワークは次を行います:

1. **ステージファイルを読む** — 5 フェーズにまたがる 32 のステージ定義。それぞれが入力、ステップ、出力、リードエージェントを指定する
2. **エージェントペルソナをロードする** — 専門知識を持つドメインエキスパートの視点(アーキテクト、開発者、プロダクトマネージャーなど)を有効化する
3. **状態と監査を管理する** — `amadeus-state.md` で進捗を追跡し、トレーサビリティのためにあらゆる決定を intent の `audit/` シャードに記録する
4. **サブエージェントへ委譲する** — 集中した自律的作業を要するステージ(リバースエンジニアリング、コード生成)では、サブプロセスを起動する
5. **承認ゲートを提示する** — 各ステージの後、ワークフローが前進する前にあなたがレビューして承認する

エンジンはルーティング(次はどのステージか、どのスコープか、いつ止めるか)を担い、コンダクターは実行品質(ステージをうまく実行する、良い質問をする、決定をあなたに提示する)を担います。ほとんどのステージは **インライン** で実行されます: コンダクターがエージェントの視点を採用し、会話の中であなたと直接作業します。2 つのステージは **サブエージェント** として実行されます: 作業はバックグラウンドのサブプロセスへ委譲され、完了時に結果が提示されます。完全なアーキテクチャについては、Developer Reference の [Engine and Skill System](../reference/17-skill-system.ja.md) を参照してください。

## このガイドの対象読者

このガイドは、AI-DLC を **使って** ソフトウェアを作るすべての人のためのものです:

- **新規ユーザー** — [Getting Started](01-getting-started.ja.md)、[Your First Workflow](02-your-first-workflow.ja.md)、[Spaces and Intents](03-spaces-and-intents.ja.md) から始める
- **通常のユーザー** — [CLI Commands](12-cli-commands.ja.md)、[Scopes, Depth, and Test Strategy](05-scopes-and-depth.ja.md)、[Troubleshooting](15-troubleshooting.ja.md) を参照する
- **チームリード** — AI-DLC をチームの標準に合わせてカスタマイズするには [Knowledge](08-knowledge.ja.md) と [Rules and the Learning Loop](09-rules-and-the-learning-loop.ja.md) を参照する

AI-DLC の *振る舞い* を作り替えるには — ステージやエージェントを追加する、スコープを定義する、ルールやセンサーを著述する、チーム知識を追加する(すべて設定であり、コードは不要)— [Harness Engineer Guide](../harness-engineering/00-overview.ja.md) を参照してください。AI-DLC のコードベース自体を変えるには、[Developer Reference](../reference/00-overview.ja.md) を参照してください。

## 主要な数値

| 指標 | 値 |
|--------|-------|
| フェーズ | 5(Initialization、Ideation、Inception、Construction、Operation) |
| ステージ | 32 |
| エージェント | 11 のドメインエキスパートペルソナ |
| スコープ | 10(bugfix から workshop まで)+ 自動検出 |
| 深さレベル | 3(Minimal、Standard、Comprehensive) |
| テスト戦略レベル | 3(Minimal、Standard、Comprehensive) |
| 監査イベント種別 | 68 |

## ガイドマップ

| 章 | 学べること |
|---------|------------------|
| [Getting Started](01-getting-started.ja.md) | 前提条件、インストール、最初のヘルスチェック |
| [Your First Workflow](02-your-first-workflow.ja.md) | 完全な 1 回の実行の注釈付きウォークスルー |
| [Spaces and Intents](03-spaces-and-intents.ja.md) | ワークスペースのレイアウト: スペースと intent をまたいで多数の作業を進める |
| [Phases and Stages](04-phases-and-stages.ja.md) | 5 フェーズと 32 ステージの解説 |
| [Scopes, Depth, and Test Strategy](05-scopes-and-depth.ja.md) | スコープ/深さ/テスト戦略の選び方と上書き方法 |
| [Agents](06-agents.ja.md) | 11 のエージェント: 誰が、いつ、何をするか |
| [Agent deep dives](agents/README.ja.md) | エージェントごとのリファレンスページ: 責務、ステージ、知識 |
| [Interaction Modes](07-interaction-modes.ja.md) | Guide Me / Grill Me / Edit File / Chat と承認ゲート |
| [Knowledge](08-knowledge.ja.md) | 会社の標準や規約の追加 |
| [Rules and the Learning Loop](09-rules-and-the-learning-loop.ja.md) | 自己学習する振る舞いのルール |
| [State and Audit](10-state-and-audit.ja.md) | 進捗と決定がどう追跡されるか |
| [Session Management](11-session-management.ja.md) | 再開、やり直し、ジャンプ、リカバリ、セッションレポートのスキル |
| [CLI Commands](12-cli-commands.ja.md) | 例付きの完全なフラグリファレンス |
| [Customization](13-customization.ja.md) | 設定、スコープ構成、エージェントのチューニング |
| [Artifacts Reference](14-artifacts-reference.ja.md) | intent ごとのレコードディレクトリ(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)の解説 |
| [Troubleshooting](15-troubleshooting.ja.md) | 症状ベースの問題解決 |
| [Worked Examples](16-worked-examples.ja.md) | bugfix と feature の完全なウォークスルー |
| [Skills and Runner Commands](17-skills.ja.md) | `/amadeus-*` ステージランナー/スコープランナーコマンドと、自作ランナーの作成手順 |
| [本家 v2 ワークスペースの移行](18-migrating-upstream-v2.ja.md) | `aidlc/` から Amadeus への dry-run、承認、互換性、復旧手順 |
| [Workshop Mode](workshop-mode.ja.md) | workshop スコープ向けのマルチ開発者手動レシピ(git push によるクレームセマンティクス) |
| [Running on other harnesses](harnesses/README.ja.md) | Kiro IDE または Codex CLI でのインストールと実行、そしてハーネスごとの相違点 |
| [Glossary](glossary.ja.md) | すべての用語の定義 |
