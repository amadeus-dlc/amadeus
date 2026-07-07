# Kiro CLI で AI-DLC を実行する

> [!NOTE]
> Kiro CLI 上の AI-DLC は **Claude Opus 4.8** で最も良く動作し、これには
> **有料の Kiro プラン** が必要です。より弱いモデルでは、コンダクターが任意の
> ステージステップ(reviewer パス、learnings の儀式)をスキップしたり、承認ゲートを
> 急いだりすることがあります。IDE 向けのディストリビューションは別途
> [Kiro IDE で AI-DLC を実行する](kiro-ide.ja.md) で文書化されています。

フレームワークのハーネスの 1 つ: `dist/kiro/` は同じ AI-DLC 方法論を
[Kiro CLI](https://kiro.dev/docs/cli/) 上で実行します。1 つの決定論的なコア
— ツール、32 個のステージファイル、プロトコル、knowledge、センサー、スコープ、
ルール — はすべてのハーネスでバイト共有されます。異なるのはシェル(スキル、
エージェント設定、フック配線、アクティベーション)だけです。

## 前提条件

- **Kiro CLI ≥ 2.6**(`kiro-cli --version`)、ログイン済み(`kiro-cli login`)
- PATH に **bun** があること(`curl -fsSL https://bun.sh/install | bash`)

## インストール

```bash
cp -r dist/kiro/.kiro your-project/.kiro
cp -r dist/kiro/amadeus your-project/amadeus       # ワークスペースシェル(spaces/default/memory) — .kiro/ の兄弟であり、中ではない
cp dist/kiro/AGENTS.md your-project/AGENTS.md   # 既にある場合はマージ
```

`amadeus/` ディレクトリはワークスペースシェルです — エンジンが読み込む
事前ビルド済みの `amadeus/spaces/default/memory/` メソッドツリーを同梱します。
これは `.kiro/` の **兄弟** なので、別途コピーしてください(または `dist/kiro/`
ツリー全体を一度にコピー)。存在しない場合、`/amadeus --doctor` はその
「workspace shell ready」チェックで失敗します。

次にプロジェクトでセッションを開始します:

```bash
kiro-cli chat
```

インストールは `.kiro/settings/cli.json` を `chat.defaultAgent: "amadeus"` 付きで
同梱するため、AI-DLC コンダクターエージェントがデフォルトでアクティブになります
— `/amadeus` はそのまま動作します。**このワークスペース設定は、あなたが設定して
いるかもしれないグローバルなデフォルトエージェントより優先されます**。自分の
デフォルトを使いたい場合は、その設定を削除して代わりに
`kiro-cli chat --agent amadeus` を使ってください。

同じ `cli.json` は、ピン留めされたオーケストレーターモデル(`claude-opus-4.8`)
向けに `xhigh` の reasoning-effort デフォルトも `chat.modelDefaults` 経由で
同梱するため、コンダクターは箱を開けた状態でフルの深さで推論します。セッションごとに
`/effort <level>`(チャット内)または `kiro-cli chat --effort <level>`
(low|medium|high|xhigh|max)で上書きします — セッションフラグとユーザーレベルの
`~/.kiro/settings/cli.json` はどちらもワークスペースのデフォルトより優先されます。

## 使い方

Claude Code ハーネスと同一です: `/amadeus <description>` でワークフローを開始し、
`/amadeus --status` で位置を報告、`--doctor`、`--stage`、`--phase`、`--depth`、
`--test-strategy` はすべて動作し、per-stage(`/amadeus-application-design`)と
per-scope(`/amadeus-feature`)のランナースキルがインストールされます。

## Kiro での相違点

| 領域 | Claude Code | Kiro CLI |
|------|-------------|----------|
| ゲート & 質問 | `AskUserQuestion` ウィジェット | 番号付きプロンプトの選択肢(番号で返信)。`[Answer]:` タグ付きの質問ファイルがソースオブトゥルースのまま |
| ステータスライン | 現在のステージ + モデル + コンテキスト % | 利用不可 — `/amadeus --status` と各ゲートの進捗行を使う |
| サブエージェントステージ(2.1、3.5) | `Task` ツール | Kiro `subagent` ツール → `amadeus-developer-agent` / `amadeus-architect-agent` 設定 |
| Construction swarm | 並列 `Task` フロア、任意の ultracode Workflow | サブエージェントの fan-out のみ。`AMADEUS_USE_SWARM=1` は no-op として告知される |
| セッション監査イベント | `SESSION_STARTED/RESUMED/ENDED`、`SESSION_COMPACTED` | `SESSION_STARTED` のみ(Kiro には session-end / pre-compaction フックがない) |
| 転送ループ強制(Stop フック) | 対話的 + ヘッドレス | 対話的セッションのみ — `--no-interactive` 実行は stop-hook ブロックを尊重しない |
| 権限 | `settings.json` の allowlist | `amadeus` エージェント設定: `bun .kiro/tools/*` のみ事前承認、他のシェルコマンドはプロンプト |
| ウェルカムメッセージ | セッション開始時に `settings.json` の `companyAnnouncements` から描画 | なし — Kiro にはウェルカム描画の相当物がない。セッション開始フックは resume コンテキストのみ注入 |
| MCP サーバー | デフォルトで同梱なし | 同梱なし、かつ Kiro の MCP 設定メカニズムはここではまだ文書化されていない |

その他すべて — ステートマシン、監査証跡、intent レコードディレクトリ配下の成果物
(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)、learnings の儀式、センサー、
スコープ、depth/test-strategy — は同一に振る舞います。なぜなら実際に同一だからです:
同じツールが `.kiro/tools/` から実行されます。

プロジェクトの `amadeus/` ワークスペースはハーネス中立です。プロジェクトを
ハーネス間で移動する(または両方を並行して実行する)ことはサポート済みだが未テストです。
`/amadeus --doctor` は、アクティブなワークフローを持つ競合するハーネスセットアップを
検出すると警告します。

## フレームワーク開発者向け

`dist/kiro` は `bun scripts/package.ts kiro` によって `core/` + `harness/kiro/`
から **生成** されます(`{{HARNESS_DIR}}` トークンを `.kiro` に置換し、
`rules/` → `steering/` をリネームしたコアコピー)。`bun scripts/package.ts --check`
がドリフトガードで、CI(t145)で実行されます。作成された Kiro サーフェスは
`harness/kiro/` にあります: オーケストレータースキル(`skills/amadeus/`)、
エージェント JSON(`agents/`)、フックアダプタ
(`hooks/amadeus-kiro-adapter.ts`)、`settings/cli.json`、`AGENTS.md` — それら
(または `core/`)を編集し、生成された `dist/kiro` は決して編集しないでください。
[新しいハーネスへの移植](../../harness-engineering/09-porting-to-a-new-harness.ja.md) を参照。

Claude のツインと並んでライブな TUI 旅路テストが存在します:
`tests/e2e/t-tui-kiro-intent-capture.serial.test.ts` は、同梱ツリーに対して
キーストロークで `kiro-cli chat` を駆動します(番号付きプロンプトのゲートを
「1」= 推奨オプションで回答し、ディスク状態で終了)。`AMADEUS_KIRO_TUI_LIVE=1`
でオプトインします。tmux、`kiro-cli`、またはログイン済みの Kiro セッションが
存在しない場合は理由付きでスキップします。

## 次のステップ

インストールとアクティベーションが完了しましたか? 方法論はどのハーネスでも同じです
— 中立な章を続けてください:

- [最初のワークフロー](../02-your-first-workflow.ja.md) — 注釈付きのエンドツーエンド実行。
- [フェーズとステージ](../04-phases-and-stages.ja.md) — 5 フェーズと 32 ステージ。
- [スコープ、深さ、テスト戦略](../05-scopes-and-depth.ja.md) — 実行の適正サイズ化。
- [用語集](../glossary.ja.md) — すべての用語の定義。

他のハーネス: [Codex CLI 上の AI-DLC](codex-cli.ja.md) · [ハーネスファミリーの索引](README.ja.md)。
