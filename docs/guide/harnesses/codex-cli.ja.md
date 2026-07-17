# Codex CLI 上の AI-DLC

> 言語: [English](codex-cli.md) | **日本語**

`dist/codex/` は、OpenAI **Codex CLI** ハーネス向けの、フレームワークのハーネス
ディストリビューションの 1 つです。1 つの決定論的なコア、多数のハーネス:
エンジン、ステートマシン、監査ログ、グラフ、swarm レフェリー、learnings ゲートは
すべてのディストリビューションでバイト単位で同一であり、異なるのはシェルだけです。
このツリーは `bun scripts/package.ts codex` によって `core/` + `harness/codex/` から
**生成** されます。手編集しないでください(ドリフトガードが CI で失敗します)。

## 前提条件

- **Codex CLI ≥ 0.139.0** — これより古いリリースはサブエージェントのフック
  ペイロードで実際のエージェントロールを表面化せず、ハイフン付きエージェント TOML を
  解決しません。`/amadeus --doctor` がこのピンを強制します。`codex --version` で確認してください。
- **bun** — Claude ハーネスと同じ要件です。すべてのツールとフックは bun 経由で実行されます。
- **モデルプロバイダ** — Codex は通常設定されたプロバイダとモデルを使います。
  同梱のプロジェクト `config.toml.example` はどちらもピンしません。プロジェクトに
  まだ存在しない場合のみ、それを `.codex/config.toml` にコピーしてください。
  プロバイダ/モデルの選択は `~/.codex/config.toml` に置くか、チームがこのプロジェクトで
  特定のランタイムを強制したい場合は意図的にプロジェクトローカルの上書きを追加してください。

## インストール

1. ディストリビューションをプロジェクトにコピーします(プロジェクトは **git
   リポジトリ** でなければなりません — Codex はその中でのみプロジェクトの
   `.codex/hooks.json` を発見します):

   ```bash
   cp -r dist/codex/.codex/  your-project/.codex/
   cp -r dist/codex/.agents/ your-project/.agents/
   cp -r dist/codex/amadeus/   your-project/amadeus/      # ワークスペースシェル(spaces/default/memory) — .codex/ の兄弟であり、中ではない
   cp dist/codex/AGENTS.md   your-project/AGENTS.md   # または既存のものにマージ
   cp -n your-project/.codex/config.toml.example your-project/.codex/config.toml
   cp -n your-project/.codex/hooks.json.example your-project/.codex/hooks.json
   ```

   `amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
   事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
   これは `.codex/` の **兄弟** なので、別途コピーしてください(または
   `dist/codex/` ツリー全体を一度にコピー)。存在しない場合、`$amadeus --doctor` は
   その「workspace shell ready」チェックで失敗します。

2. 同梱の `AGENTS.md` の § 「Git Integration」にある `.gitignore` エントリを
   ワークフロー開始 **前** に適用してください — 各 intent の `audit/` 配下の
   per-clone 監査シャードは意図的にコミットされます(各クローンが自身の
   `<host>-<clone>.md` を書くため、並行 append が git 競合しません)。一方、
   per-user カーソルとマシンローカルなランタイム状態は無視されたままにします。

3. プロジェクトを trust します。Codex の trust は **2 層** あり、どちらも
   `$CODEX_HOME/config.toml` に事前シードする必要があります:

   - **第 1 層 — プロジェクト trust:** `trust_level = "trusted"` を持つ
     `[projects."<プロジェクトの絶対パス>"]` テーブル。これがゲートです。
     **第 1 層が無いと Codex はこのプロジェクトの `.codex` フック層全体を
     無警告でスキップし**、第 2 層はそもそも実行されません。
   - **第 2 層 — フック trust:** `[hooks.state."..."]` エントリ。Codex は
     untrusted なフックを決して実行しません(`--dangerously-bypass-hook-trust`
     フラグでも実行しません)。

   `scripts/team-up.sh` は各 Codex メンバーについて両層を自動でシードします。
   手動でシードする場合は、対話的な TUI セッションを 1 回実行して hooks
   ダイアログで「Trust all and continue」を選ぶか、決定論的に事前シードします:

   ```toml
   # 第 1 層 — プロジェクト trust(手で追記)
   [projects."/abs/path/to/your-project"]
   trust_level = "trusted"
   ```

   ```bash
   # 第 2 層 — フック trust(そのまま貼り付け可能な形で出力)
   bun scripts/package.ts codex trust --project /abs/path/to/your-project
   ```

   第 2 層のコマンドは `$CODEX_HOME/config.toml` 用の、そのまま貼り付け可能な
   `[hooks.state]` エントリを追記します(ハッシュはパスではなくフックの
   アイデンティティをカバーします — 出力されるエントリは同梱の
   `hooks.json.example` から作成した `hooks.json` に対して正確です)。
   `$amadeus --doctor` は第 1 層の存在を loud に検査し、第 2 層について
   リマインドします。

4. プロジェクトが意図的に Codex 設定を所有する場合のみ `.codex/config.toml` を
   プロジェクトレベルに保ちます。そうでなければプロバイダ/モデルの選択は
   `~/.codex/config.toml` に置いてください。次で検証します:

   ```bash
   bun .codex/tools/amadeus-utility.ts doctor
   ```

## 使い方

オーケストレーターは `$amadeus`(または `/skills` → amadeus)にスコープや説明を
続けて起動します — Claude ハーネスと同じコマンドです(`$amadeus --status`、
`$amadeus --help`、…)。ステージランナーは明示指定のみです:
`$amadeus-application-design`、`$amadeus-bugfix` など(37 個のランナー説明が
インデックスを汚染しないよう、暗黙のスキルマッチングから除外されています)。

## Claude Code との相違点

- **ゲート** は常に番号付き prose で描画します(番号または自由テキストで回答)。
  Codex の組み込み質問ツールへの回答は同梱の PostToolUse hook から観測できませんが、
  prose への回答は UserPromptSubmit adapter に到達し、human-presence guard が要求する
  監査可能な `HUMAN_TURN` を記録できます。ゲートのセマンティクスは引き続き
  エンジンにあります。
- **カスタムステータスラインなし** — ワークフローの位置は `update_plan` ツール
  (`task-progress` ステータスライン項目)と `$amadeus --status` に乗ります。
- **サンドボックス下の Git**: `workspace-write` は設計上、サンドボックス内で
  `.git` を読み取り専用に保ちます。対話的セッションは自動でエスカレートし、
  同梱の `.codex/rules/default.rules` が `git worktree`/`commit`/`add` を
  事前許可します。ヘッドレス実行(CI、exec ワーカー)には
  `writable_roots = ["<main repo>/.git"]` が必要です — 同梱の
  `config.toml.example` テンプレートにあります(リンクされた worktree は
  `<main>/.git/worktrees/*` に解決されるため、メインリポジトリの `.git` でなければなりません)。
- **Swarm フロア = `codex exec` ワーカー** — Bolt worktree 内で Construction
  ユニットごとに 1 つのヘッドレスワーカー(常に `< /dev/null`)、同じ決定論的
  レフェリーを使います。`AMADEUS_USE_SWARM=1` はここでは Workflow ツールを持たず、
  loud-degrade します(`SWARM_DEGRADED` が監査されます)。
- **セッションライフサイクル**: Codex には SessionEnd イベントがありません。
  閉じられなかったセッションは、次のセッション開始時に推論された `SESSION_ENDED`
  監査行として調整されます。Codex 専用の PostCompact イベントは compaction 後に
  ワークフローミッションを再注入します — Claude ハーネスに対する決定論の向上です。
- **成果物の監査精度**: ヘッドレスな `codex exec` 実行ではモデルがしばしば
  シェルヒアドキュメント経由でファイルを書き込み、これは `apply_patch` フック
  マッチャーをバイパスします — `ARTIFACT_*` 行がまばらになることがあります。
  対話的な TUI セッション(システムプロンプトが `apply_patch` を義務付ける)が
  高精度の監査モードです。
- **AIDLC ルールレイヤー** はワークスペースルート配下の
  `amadeus/spaces/<space>/memory/` にあります(1 つの手編集可能なソース、
  すべてのハーネスで同一)。`config.toml` の `AMADEUS_RULES_DIR` 環境シームが
  リゾルバをそこへ向け、オーケストレーターが `@amadeus/spaces/<space>/memory/...`
  というプロンプトメンションを注入します。Codex ネイティブの `.codex/rules/`
  ディレクトリは Starlark 権限ルールを保持します — AIDLC メソッドとは別物です。
- **ウェルカムメッセージなし**: Claude ハーネスはセッション開始時に
  `settings.json` の `companyAnnouncements` から Phases/Stages/Scopes の
  オンボーディングバナーを描画しますが、Codex には相当物がありません。
  セッション開始パスは resume コンテキストのみを注入します。
- **MCP サーバー**: Codex は `config.toml`(プロジェクトの `.codex/config.toml`
  または `~/.codex/config.toml`)の `[mcp_servers.<name>]` テーブルから MCP 定義を
  読みます — 必要なサーバーをそこに追加してください。同梱の設定は **1 つも** 宣言
  しません(Claude も Codex もデフォルトでプロジェクト MCP サーバーをゼロ同梱します)。

## 再生成

```bash
bun scripts/package.ts codex          # core/ + harness/codex/ から dist/codex を再生成
bun scripts/package.ts --check        # CI ドリフトガード(全ハーネス)
```

コアの `.ts` ファイルはそれらの `core/tools/` と `core/hooks/` のソースと
バイト単位で同一です(`tests/unit/t150-codex-packaging.test.ts` でピン留め)。
プロセ(散文)は `{{HARNESS_DIR}}` トークンを持ち、パッケージャがこれを `.codex`
に置換します(加えて `rules/` → `amadeus-rules/` のリネーム)。これが許可された
唯一の変換クラスです。ライブなエンドツーエンドの旅路は
`tests/e2e/t-exec-codex-status.serial.test.ts` です(ゲート:
`AMADEUS_CODEX_EXEC_LIVE=1`)。

## 次のステップ

インストールと trust が完了しましたか? 方法論はどのハーネスでも同じです — 中立な
章を続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深さ、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正サイズ化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [Kiro IDE で AI-DLC を実行する](kiro-ide.ja.md) · [ハーネスファミリーの索引](README.ja.md)。
