# Kiro IDE で AI-DLC を実行する

> 言語: [English](kiro-ide.md) | **日本語**

フレームワークのハーネスの 1 つ: `dist/kiro-ide/` は同じ AI-DLC 方法論を
[Kiro IDE](https://kiro.dev/) の中で実行します。1 つの決定論的なコア —
ツール、32 個のステージファイル、プロトコル、knowledge、センサー、スコープ、
ルール — はすべてのハーネスでバイト共有されます。異なるのはシェル(スキル、
エージェント設定、フック配線、アクティベーション)だけです。

> [!IMPORTANT]
> **Kiro IDE 上の AI-DLC は Claude Opus 4.8 で実行してください。** コンダクターは
> ステージごとに複数ステップの儀式 — 明確化のための質問、成果物生成、reviewer
> パス、learnings の儀式、そして承認ゲート — を駆動します。Opus 4.8 はフルの
> 儀式に従い、すべてのゲートで正しく一時停止します。より弱いモデルは任意の
> ステップ(reviewer パスと learnings の儀式)をスキップし、ゲートを急ぐことが
> あります。ワークフロー開始前にチャットモデルを **Claude Opus 4.8** に設定してください。

## 前提条件

- **Kiro IDE**、サインイン済み
- チャットモデルとして **Claude Opus 4.8** が選択されていること(上記の注記を参照)
- PATH に **bun** があること(`curl -fsSL https://bun.sh/install | bash`)

> [!TIP]
> bun は *非対話的* シェルが見る PATH 上になければなりません — IDE がフックや
> ツールを実行するのにそれを使います。それらのシェルは `~/.zshenv`(zsh)または
> `~/.bashrc`(bash)を読み、`~/.zshrc` は読みません。しかし bun のインストーラは
> `~/.zshrc` に書き込みます。ターミナルでは `which bun` が動くのにフックが bun を
> 見つけられない場合は、`BUN_INSTALL`/`PATH` の export を `~/.zshenv`(または
> `~/.bashrc`)にコピーしてください。

## インストール

```bash
cp -r dist/kiro-ide/.kiro your-project/.kiro
cp -r dist/kiro-ide/amadeus your-project/amadeus        # ワークスペースシェル(spaces/default/memory) — .kiro/ の兄弟であり、中ではない
cp dist/kiro-ide/AGENTS.md your-project/AGENTS.md   # 既にある場合はマージ
```

`amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
これは `.kiro/` の **兄弟** なので、別途コピーしてください(または
`dist/kiro-ide/` ツリー全体を一度にコピー)。存在しない場合、
`/amadeus --doctor` はその「workspace shell ready」チェックで失敗します。

`your-project/` を Kiro IDE で開きます。インストールは次を同梱します:

- `.kiro/settings/cli.json`(`chat.defaultAgent: "amadeus"` 付き)。これにより
  AI-DLC コンダクターエージェントがデフォルトでアクティブになります —
  `/amadeus` はそのまま動作します。
- `.kiro/hooks/*.kiro.hook` — IDE のネイティブなフック形式で登録された
  フレームワークフック。IDE の Agent Hooks パネルに表示されます。

チャットパネルで `/amadeus --doctor` を実行してセットアップを検証し、次に
`/amadeus <description>` でワークフローを開始します。

## Kiro IDE でフックがどう動くか

Kiro IDE は `.kiro/hooks/` 配下の `.kiro.hook` ファイルを通じてフックを登録します
(エージェント JSON 内の `hooks` ブロックを読む Kiro CLI とは異なるメカニズム)。
各 `.kiro.hook` は共有された `amadeus-kiro-adapter.ts` シムを経由するコマンドを
実行し、これが IDE のフックイベントをバイト共有されたコアフックが期待する形に
正規化します。

| フック | IDE イベント | 目的 |
|------|-----------|---------|
| `amadeus-session-start` | `promptSubmit` | ワークフロー resume コンテキストを注入 |
| `amadeus-mint` | `promptSubmit` | すべてのプロンプトで human-turn イベントを記録(human-presence ゲート) |
| `amadeus-session-end` | `agentStop` | `SESSION_ENDED` を発行(可観測性) |
| `amadeus-stop` | `agentStop` | 転送ループの継続 |
| `amadeus-block` | `preToolUse` | 承認ゲートが開いていて以降に人間が行動していない間、ツール呼び出しをハードブロック(human-presence フロア) |
| `amadeus-audit-logger` | `postToolUse`(write) | 成果物の作成/更新をログ |
| `amadeus-sensor-fire` | `postToolUse`(write) | 該当するセンサーを発火 |
| `amadeus-runtime-compile` | `postToolUse`(shell) | ランタイムグラフを再コンパイル |
| `amadeus-sync-statusline` | `postToolUse`(spec) | タスク遷移時に状態を同期 |

各フックが発火するたびに、チャットに「Run Command Hook」の行が表示されます。

## Kiro IDE での相違点

| 領域 | Claude Code | Kiro IDE |
|------|-------------|----------|
| フック登録 | `settings.json` の `hooks` ブロック | `.kiro/hooks/*.kiro.hook` ファイル(Agent Hooks パネルに表示) |
| ゲート & 質問 | `AskUserQuestion` ウィジェット | 番号付きプロンプトの選択肢(番号で返信)。`[Answer]:` タグ付きの質問ファイルがソースオブトゥルースのまま |
| ステータスライン | 現在のステージ + モデル + コンテキスト % | 利用不可 — `/amadeus --status` と各ゲートの進捗行を使う |
| サブエージェントステージ(2.1、3.5) | `Task` ツール | Kiro `subagent` ツール → `amadeus-developer-agent` / `amadeus-architect-agent`。IDE は delegate のツール付与をエージェント `.md` frontmatter(`tools:`)から読み、パッケージング時に注入される — agent-v1 JSON は CLI 専用 |
| Construction swarm | 並列 `Task` フロア、任意の ultracode Workflow | サブエージェントの fan-out のみ。`AMADEUS_USE_SWARM=1` は no-op として告知される |
| セッション監査イベント | `SESSION_STARTED/RESUMED/ENDED`、`SESSION_COMPACTED` | `SESSION_STARTED` / `SESSION_ENDED`(pre-compaction イベントなし) |
| MCP サーバー | デフォルトで同梱なし | 同梱なし |

その他すべて — ステートマシン、監査証跡、per-intent レコードディレクトリ配下の
成果物(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)、learnings の儀式、
センサー、スコープ、depth/test-strategy — は同一に振る舞います。なぜなら実際に
同一だからです: 同じツールが `.kiro/tools/` から実行されます。

プロジェクトの `amadeus/` ワークスペースはハーネス中立です。プロジェクトを
ハーネス間で移動する(または両方を並行して実行する)ことはサポート済みだが
未テストです。`/amadeus --doctor` は、アクティブなワークフローを持つ競合する
ハーネスセットアップを検出すると警告します。

## フレームワーク開発者向け

`dist/kiro-ide` は `bun scripts/package.ts kiro-ide` によって `core/` +
`harness/kiro-ide/` から **生成** されます(`{{HARNESS_DIR}}` トークンを `.kiro`
に置換し、`rules/` → `steering/` をリネームしたコアコピー)。
`bun scripts/package.ts --check` がドリフトガードで、CI で実行されます。作成された
Kiro IDE サーフェスは `harness/kiro-ide/` にあります: オーケストレーター
スキル(`skills/amadeus/`)、エージェント JSON(`agents/`)、フックアダプタと
`.kiro.hook` ファイル(`hooks/`)、`settings/cli.json`、`AGENTS.md` — それら
(または `core/`)を編集し、生成された `dist/kiro-ide` は決して編集しないでください。

IDE ハーネスは CLI ハーネス(`harness/kiro/`)と 3 点で異なります: `.kiro.hook`
ファイルを同梱する(CLI はエージェント JSON の `hooks` ブロックに依存し、IDE は
それを無視する)。`amadeus.json` はその死んだ `hooks` ブロックを省く。そして
その manifest が委譲先のエージェント `.md` ファイルに `tools:` frontmatter 付与を
注入する(`frontmatterAdditions`)。IDE は委譲されたサブエージェントのツールを
agent-v1 JSON ではなく `.md` frontmatter から解決するためで、付与がないと IDE
delegate はツールなしで実行されます。この frontmatter 付与はスコープなし(IDE には
そこに `allowedCommands`/`allowedPaths` の相当物がない)で、CLI JSON サンドボックスより
広いことに注意してください。
[新しいハーネスへの移植](../../harness-engineering/09-porting-to-a-new-harness.ja.md) を参照。

## 次のステップ

インストールとアクティベーションが完了しましたか? 方法論はどのハーネスでも同じです
— 中立な章を続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深さ、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正サイズ化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [Codex CLI 上の AI-DLC](codex-cli.ja.md) · [ハーネスファミリーの索引](README.ja.md)。
