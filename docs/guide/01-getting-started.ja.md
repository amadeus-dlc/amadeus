# Getting Started

この章では、この実装のインストール、環境の検証、そして最初のワークフローに向けた準備を順に説明します。

---

## 前提条件

この実装には、システム上に 2 つのツールが必要です:

| 前提条件 | 目的 | インストール |
|-------------|---------|---------|
| **Claude Code** | この実装は Claude Code のコマンドとして動作します。オーケストレーター、エージェント、フックはすべて Claude Code 内で実行されます。 | ネイティブインストール(推奨、自動更新): macOS/Linux/WSL `curl -fsSL https://claude.ai/install.sh \| bash`; Windows PowerShell `irm https://claude.ai/install.ps1 \| iex`。または `brew install --cask claude-code`。([docs](https://code.claude.com/docs/en/quickstart)) |
| **bun** | すべての CLI ツールと 11 個すべてのフック(状態管理、監査ログ、センサーディスパッチ、runtime-graph コンパイル、ループ強制、statusline、human-turn mint)に必要です。すべて TypeScript で、bun 経由で実行されます(起動 ~20ms)。追加の依存関係なし — macOS、Linux、ネイティブ Windows PowerShell で同一に動作します。 | `curl -fsSL https://bun.sh/install \| bash` ([docs](https://bun.sh))。Windows では: `npm install -g bun` または `powershell -c "irm bun.sh/install.ps1 \| iex"` |

> **重要**: 非インタラクティブシェルでは `bun` が `PATH` 上になければなりません。Claude Code はシェルを非インタラクティブに実行するため、`~/.zshenv`(zsh)または `~/.bashrc`(bash)を読み込みます — `~/.zshrc` ではありません。Windows で Git Bash を使う場合は `~/.bashrc` が正しいファイルです。Claude Code 内で `which bun` が失敗する場合は、bun の PATH エクスポートを該当ファイルに追加してください。

前提条件を検証します:

```bash
command -v claude >/dev/null && echo "✓ Claude Code installed" || echo "✗ Install Claude Code first"
command -v bun    >/dev/null && echo "✓ bun installed"          || echo "✗ Install bun first"
```

## モデルプロバイダのセットアップ

同梱の Claude Code および Codex の設定は、プロバイダやモデルを固定しません。Amadeus-DLC は、それを実行するハーネスの通常のデフォルトを使います:

- Claude Code は、あなたのいつもの Claude Code のアカウント、プロバイダ、モデル設定を読みます。
- Codex は、あなたのいつもの `~/.codex/config.toml` とプロジェクトの trust 設定を読みます。
- プロジェクトローカルのプロバイダ/モデルの上書きは任意であり、チームが意図的にこのプロジェクトで特定のランタイムを強制したい場合にのみ追加すべきです。

認証情報や個人的なプロバイダ選択は、コミットされるプロジェクトファイルには含めないでください。Claude Code では `.claude/settings.local.json` またはユーザーレベルの設定を使います。Codex では、プロジェクトが意図的に共有ランタイムポリシーを所有する場合を除き、`~/.codex/config.toml` を使います。

## MCP サーバー(任意)

Claude Code の配布物は、デフォルトではプロジェクトの `.mcp.json` を同梱しません。ワークフローが外部ツールや追加の文脈を必要とする場合にのみ、プロジェクトまたはユーザーの MCP サーバー定義を追加してください。Claude Code は宣言されたサーバーをセッションにプロビジョニングし、すべての Amadeus-DLC エージェントはそれらのセッションサーバーを継承します — エージェントごとの付与作業は不要です。

> **エージェントの制限(上級者向け):** 継承は加算的です — サーバーを宣言するとすべてのエージェントで利用可能になり、エージェントごとにサーバーを付与することはできません。特定のエージェントがサーバーを使うのを *防ぐ* には、そのエージェントの `tools:` 許可リストを、呼び出してよい完全修飾の `mcp__<server>__<tool>` ID に絞ります(裸の `mcp__<server>` トークンは尊重されません)。エージェントのツールアクセスの仕組みについては [Agents](06-agents.md) を参照してください。

### これらを使わない場合は?

認証情報の欠落はブロッキングにはなりません。認証情報がないサーバーは単に利用不可となり、ワークフローはそれなしで実行され、それを待って停止することはありません。サーバーを完全に外すには、プロジェクトまたはユーザーの MCP 設定からそのエントリを削除してください。

---

## インストール

AI-DLC は、あなたのハーネス向けの配布物をプロジェクトへコピーすることでインストールします。以下の手順は **Claude Code**(`dist/claude/.claude/` ツリー)を対象とします。Kiro または Codex を実行しますか? それぞれが独自の配布物とインストール手順を同梱しています — [Running on Kiro IDE](harnesses/kiro-ide.md) または [Running on Codex CLI](harnesses/codex-cli.md) を参照してください。Claude Code 実装は、プロジェクトにコピーする `.claude/` ディレクトリとして提供されます。

### ステップ 1: 実装をコピーする

```bash
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/amadeus/   your-project/amadeus/     # the workspace shell — a sibling of .claude/, not inside it
```

1 行目はエンジン — オーケストレーター、ステージファイル、エージェントペルソナ、フック、知識ファイル、デフォルト設定 — をコピーします。2 行目は **ワークスペースシェル** をコピーします: エンジンが読む、事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーです。これは `.claude/` の **兄弟** として(その内側ではなく)提供されるため、別途コピーする必要があります — または `dist/claude/` ツリー全体を一度にコピーします。`amadeus/spaces/default/memory/` が欠けていると、`/amadeus --doctor` の「workspace shell ready」チェックが失敗します。

### ステップ 2: プロジェクトへ移動する

```bash
cd your-project
```

すべての `/amadeus` コマンドはプロジェクトルートを基準に実行されます。

---

## ワークスペースシェル

スキャフォールドのステップはありません。コピー済みの配布物には、すでにワークスペースシェルが同梱されています — `.claude/` エンジンに加え、メモリ層(`amadeus/spaces/default/memory/`。チームが確約したプラクティスと学習が置かれる場所)を保持する事前ビルド済みの `amadeus/spaces/default/` です。init コマンドを実行する必要はありません。

初めて `/amadeus` を実行する(または作りたいものを記述する)と、エンジンは最初の intent をアクティブなスペースへ **auto-birth(自動誕生)** させます。各 intent は `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` に独自のレコードディレクトリを持ち、そこには次が含まれます:

- `amadeus-state.md` — intent ごとのワークフロー状態
- `audit/` — 監査証跡。per-clone シャード(`<host>-<clone>.md`)として書き込まれる
- `<phase>/<stage>/...` — ステージ成果物(例: `inception/requirements-analysis/requirements.md`)

チーム知識は 1 階層上、スペースレベル — `amadeus/spaces/<space>/knowledge/`(`intents/` の兄弟)— に置かれるため、そのスペースのすべての intent をまたいで蓄積されます。エンジンはこれを空で作成します。任意の `amadeus-shared/` 配下やエージェントごとのサブディレクトリに、自由形式のファイルを追加します。

最初の実行前に [チーム知識](08-knowledge.md) やチームのプラクティスを追加するには、同梱の `amadeus/spaces/default/memory/` ファイルを編集します。スペースレベルの `amadeus/knowledge/` ディレクトリは、最初の `/amadeus` を実行した時点で(空で)作成されます。

ワークスペースレイアウトの全体像 — 多数の intent を一度に保持する仕組み、スペースの用途、それらの間を移動するコマンド — については、[Spaces and Intents](03-spaces-and-intents.md) を参照してください。

---

## セットアップの検証

すべてが揃っていることを確認するため、ヘルスチェックを実行します:

```
/amadeus --doctor
```

`--doctor` は、すべてのチェックが通ると 0 で終了し、いずれかが失敗すると 1 で終了します。完全なレポートは、どちらの場合も stdout に書き出されます。

### `--doctor` が確認する項目

| チェック | 検証する内容 |
|-------|-------------------|
| 前提条件 | `bun` がインストールされ、`$PATH` 上にある |
| フックの存在 | `settings.json` が接続するすべてのフック(その `hooks` ブロック + `statusLine` コマンド — 11 個すべてのフレームワークフック)が `.claude/hooks/` に存在する。接続されているのに欠けているフックは大声で失敗する。想定されるフック一覧を `settings.json` から取得するため、そこにフックを追加すると自動でチェックされる |
| プロジェクト構造 | `.claude/settings.json` が想定される構成で存在する |
| ワークスペースシェル | `.claude/` + `amadeus/spaces/default/memory/` が存在する(同梱シェル) |
| 状態ファイル | アクティブな intent の `amadeus-state.md` がその監査証跡と一致する(ドリフトなし) |
| フックのハートビート | `.amadeus-hooks-health/` にフック実行からの最近のタイムスタンプが含まれる |
| グラフの整合性 | `stage-graph.json` にサイクルがない。すべての slug に対応するステージファイルがある |
| スコープの検証 | 9 つのスコープすべてがグラフに対してクリーンに走査できる(スコープ切り詰めギャップに対する advisory は想定内) |
| スキーマ + 参照 | すべてのステージの YAML フロントマターが検証され、すべての consumes/requires_stage 参照が解決する |
| キーワードの重複 | `.claude/scopes/*.md` ファイル間で、複数のスコープが同じキーワードを主張していない |

### 出力例

```
✓ bun installed (required for CLI tools and hooks)
✓ amadeus-audit-logger.ts present
✓ amadeus-sync-statusline.ts present
✓ amadeus-validate-state.ts present
✓ amadeus-log-subagent.ts present
✓ amadeus-session-start.ts present
✓ amadeus-session-end.ts present
✓ amadeus-statusline.ts present
✓ settings.json present
✓ AMADEUS_DEFAULT_SCOPE (unset — no project default)
✓ workspace shell ready (.claude/ + amadeus/spaces/default/memory/)
✓ Hook heartbeats: not yet fired (first workflow stage will populate)
✓ State matches last audit event (no drift)
✓ Cycle detection: 0 cycles
✓ Orphan stage files: 32 graph entries all have files
✓ Scope validation: 9 scopes valid (29 advisories)
✓ Schema validation: 32/32 stages valid
✓ Graph references: 122 artifacts + edges resolved
✓ Keyword overlap: no conflicts
```

### 失敗の修正

| 失敗 | 修正 |
|---------|-----|
| `bun` がインストールされていない | `curl -fsSL https://bun.sh/install \| bash` でインストール。Windows では: `npm install -g bun` または `powershell -c "irm bun.sh/install.ps1 \| iex"`。非インタラクティブシェルの PATH 上にあることを確認する。 |
| フックが存在しない | 配布物から `.claude/` ディレクトリを再コピーする |
| `settings.json` が欠けている | 既存の設定を上書きせずにテンプレートから作成する: `cp -n dist/claude/.claude/settings.json.example .claude/settings.json` |
| ワークスペースシェルが欠けている | `dist/claude/` からワークスペースシェルをプロジェクトルートへ再コピーする |
| 状態ファイルの問題 | アクティブな intent のレコードディレクトリを `amadeus/spaces/<space>/intents/` 配下でアーカイブし、`/amadeus` を実行して新規に開始する |
| グラフ/スコープ/スキーマ/キーワードの失敗 | 診断が、原因となる具体的な成果物、slug、スコープ名を報告する。これらは `.claude/amadeus-common/stages/` または `.claude/scopes/` の著述ドリフトを示す。`bun .claude/tools/amadeus-graph.ts compile` でコンパイル済みグラフ + スコープグリッドを再生成するか、名指しされたステージ/スコープを直接確認する。 |

---

## 最初のワークフローを開始する

`--doctor` が通ったら、実行の準備完了です:

```
/amadeus Build a REST API for inventory management
```

またはスコープを直接指定します:

```
/amadeus feature
/amadeus bugfix Fix the login timeout issue
```

次に何が起こるかのステップバイステップのウォークスルーは [Your First Workflow](02-your-first-workflow.md) を参照してください。

---

## クイックリファレンス

シェルで:

```bash
# Verify prerequisites
command -v claude >/dev/null && echo "✓ Claude Code" || echo "✗ Claude Code"
command -v bun    >/dev/null && echo "✓ bun"          || echo "✗ bun"

# Install (engine + the workspace shell sibling)
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/amadeus/   your-project/amadeus/
cp -n your-project/.claude/CLAUDE.md.example your-project/.claude/CLAUDE.md
cp -n your-project/.claude/settings.json.example your-project/.claude/settings.json

# Launch Claude Code in your project
cd your-project && claude
```

Claude Code セッション内で:

```
# Verify (exits 1 on any check failure; read stdout for the full report)
/amadeus --doctor

# Start
/amadeus Build a task management API with user authentication
```

---

## ツールの権限

同梱の `.claude/settings.json.example` は、Claude Code のツール(Read、Edit、Write、Bash、Glob、Grep、Task、WebSearch)を事前承認しているため、`.claude/settings.json` へコピーした後は、呼び出しごとの権限プロンプトなしでワークフローが実行されます。使用前にファイルをレビューし、あなたのセキュリティ要件に合わせて調整してください。

ツール権限の変更の詳細は [Customization](13-customization.md) を参照してください。

---

## 次のステップ

- [Your First Workflow](02-your-first-workflow.md) — 完全な 1 回の実行の注釈付きウォークスルー
- [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) — タスクに合ったスコープの選び方
- [Troubleshooting](15-troubleshooting.md) — よくある問題と修正
- [Glossary](glossary.md) — 用語リファレンス
