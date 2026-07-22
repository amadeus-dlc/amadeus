# Amadeus-DLC

> 言語: [English](README.md) | **日本語**

**Amadeus-DLC はセルフホスト型の AI 開発ライフサイクルです。決定的なワークフローエンジンと、ゲート付き32ステージのメソドロジーを一度だけ記述し、6つのコーディングエージェントハーネスの上でネイティブに動かします。** あなたは「何を作るか」を記述するだけ — 11のドメイン専門家エージェントが ideation・inception・construction・operation を進め、プロンプトではなく**コードとして実装された状態機械**が、あなたが通すまですべての承認ゲートを保持します。

![version](https://img.shields.io/badge/version-0.1.3-blue)
![license](https://img.shields.io/badge/license-(MIT%20OR%20Apache--2.0)-green)
![Kiro IDE](https://img.shields.io/badge/harness-Kiro%20IDE-orange)
![Kiro CLI](https://img.shields.io/badge/harness-Kiro%20CLI-orange)
![Claude Code](https://img.shields.io/badge/harness-Claude%20Code-orange)
![Codex CLI](https://img.shields.io/badge/harness-Codex%20CLI-orange)
![OpenCode](https://img.shields.io/badge/harness-OpenCode-orange)
![Cursor](https://img.shields.io/badge/harness-Cursor-orange)

> [!WARNING]
> **プレビュー版(pre-1.0)— 活発に開発中です。** インターフェース、ステージ定義、エージェント構成、インストールモデルは進化の途上にあり、リリース間で破壊的変更が入ることがあります。依存するものには既知の安定バージョンをピン留めし、生成された出力はすべて確認してから利用してください。

## なぜ Amadeus-DLC か

行き当たりばったりの AI コーディングは、プロジェクトが本格化するまでは機能します。しかしやがて、プロンプト間でコンテキストが漂流し、意思決定の理由が記録されず、モデルは頼んでいないことを静かにやり始めます。

これを直そうとする多くの試みは、モデルの上にさらにプロンプトを積み上げて遵守を祈ります。Amadeus は逆に賭けました: **交渉不可能であるべきものはすべて、モデルの外の決定的なコードへ移す。** ステージ列は慣習ではなくコンパイル済みグラフです。承認ゲートは前進を拒否する CLI 状態機械が強制し、言いくるめることはできません。すべてのイベントは追記専用の監査証跡に記録されます。センサーは、モデルの主張とは独立に、実際のリンターと構造検査をすべての成果物に対して実行します。モデルは作業を**指揮**し、エンジンがそれを**裁定**します。

このエンジンの周りで、メソドロジーが残りを担います:

- **構造** — 5フェーズ・32ステージ。各ステージに明確な担当者と宣言された入出力があり、次へ進む前に人間のゲートがあります。
- **記憶** — あなたの是正は層状のメソッドツリー(`org → team → project → phase → stage`)に永続的なルールとして蓄積され、同じ過ちは二度繰り返されません。
- **比例** — 使い捨ての PoC も規制産業のエンタープライズ開発も同じエンジンで走ります。スコープが実行ステージを選ぶだけで、adaptive composer はあなたのタスクに合わせた計画も提案します。

そして Amadeus は**セルフホスト**です: Amadeus は Amadeus で開発されています。このリポジトリのすべての機能は、出荷される前に自分自身のステージ・ゲート・監査証跡を通過しています。

## ワークフローの流れ

`/amadeus` に続けて作りたいものを入力すると、エンジンが **intent** を誕生させ、ワークスペースを検出し(greenfield / brownfield)、スコープを選択(明示指定も可)して、ステージグラフを歩き始めます:

1. **Ideation** — 意図の把握、実現可能性の評価、スコープ内外の確定、イニシアチブの承認。
2. **Inception** — 既存コードのリバースエンジニアリング、要件とストーリーの確定、アプリケーション設計、依存 DAG 付き **unit of work** への分割。
3. **Construction** — **Bolt** 単位でユニットごとに構築。greenfield スコープでは最初に **walking skeleton**(エンドツーエンドの薄いスライス)を出荷し、あなたの承認を得てから残りを構築します。独立したユニットは、決定的な収束レフェリーの下で並列ワーカーへファンアウトできます。
4. **Operation** — パイプライン、プロビジョニング、可観測性、インシデント対応 — スコープが要求する場合。

すべてのステージで、リードエージェントが `amadeus/` ワークスペースツリーにレビュー可能な成果物を生成し、レビュアーペルソナがそれに挑戦し、センサーが機械的に検証し、ゲートがあなたを待ちます。いつでも中断でき、`/amadeus` が記録された状態から再開します。

## 同梱されているもの

- **[5フェーズ・32ステージ](docs/guide/04-phases-and-stages.ja.md)** — Initialization、Ideation、Inception、Construction、Operation
- **[11のドメイン専門家エージェント](docs/guide/06-agents.ja.md)** — product、design、delivery、architect、aws-platform、compliance、devsecops、developer、quality、pipeline-deploy、operations
- **[10の標準スコープ](docs/guide/05-scopes-and-depth.ja.md)**(enterprise から workshop まで)+ 自由記述からの自動検出、そしてタスクに合わせた EXECUTE/SKIP 計画を提案し、承認された計画を再利用可能な composed スコープとして登録する **adaptive composer**
- **[3段階の depth と 3段階の test strategy](docs/guide/05-scopes-and-depth.ja.md)** — 成果物の詳細度とテスト量を独立に制御
- **[全ステージの承認ゲート](docs/guide/07-interaction-modes.ja.md)** — エンジンが強制。1問ずつからファストトラックまでのインタラクションモード
- **[スペースと intent](docs/guide/03-spaces-and-intents.ja.md)** — intent ごとの記録、チームごとのスペース、すべてリポジトリでバージョン管理
- **[ルールと学習ループ](docs/guide/09-rules-and-the-learning-loop.ja.md)** — 人間の是正が層状のメソッドルールとして永続化。矛盾を拒否する admission check 付き
- **[2層のナレッジ](docs/guide/08-knowledge.ja.md)** — メソドロジー知識はフレームワークに同梱、チーム・ドメイン知識はワークスペースに蓄積
- **[決定的センサー](docs/harness-engineering/06-sensors.ja.md)** — リンター、型検査、構造検査がステージごとに自動発火
- **[プラグイン](docs/guide/19-plugins.ja.md)** — フレームワーク本体を編集せずにステージ・シームエントリ・プロズフラグメントをワークスペースへ追加する小さな手書きバンドル。全ハーネスへ投影され、アトミックに合成され、痕跡なく除去できる
- **[状態機械と監査証跡](docs/guide/10-state-and-audit.ja.md)** — 追記専用・クローンごとの監査シャード。すべてのゲート、回答、センサー判定が記録に残る
- **[セッション管理](docs/guide/11-session-management.ja.md)** — チェックポイントからの再開、やり直し、任意のステージ・フェーズへのジャンプ、park / unpark
- **[CLI ユーティリティ](docs/guide/12-cli-commands.ja.md)** と **[セッションスキル](docs/guide/17-skills.ja.md)** — status、doctor、コストレポート、リプレイ、アウトカムパック、grilling インタビュー

## 独立した開発ライン

Amadeus-DLC は AWS が定義した **AI-DLC メソドロジー**(段階的・ゲート付きの AI 駆動開発アプローチ)の実装です([出自と謝辞](#出自と謝辞)参照)。リファレンス実装のフォークとして出発しましたが、以来「**メソドロジーの信頼性は、それを強制する機構の信頼性を超えない**」という確信を軸に、独自の開発ラインとして歩んでいます。Amadeus 独自のものには次があります:

- **決定的エンジン** — コンパイル済みステージグラフ、スコープグリッド、状態機械、ゲート強制、追記専用監査シャード
- **マルチハーネスパッケージャ** — ハーネス中立な `packages/framework/core/` を唯一の正本として6つの配布物を生成、CI のバイトパリティドリフトガード付き
- **インストーラ** — `@amadeus-dlc/setup` が任意のハーネス配布物をプロジェクトへインストール・アップグレード
- **adaptive composer**、**センサー**、admission gate 付き**学習ループ**、並列 Construction のための **swarm レフェリー**、読み取り専用の**セッションスキル**(cost / replay / outcomes / grilling)

上流のリリースは今も追跡しています — ただし自動ではなく意図的に: 各上流バージョンを項目ごとに分析し、証拠に基づく ADOPT / ADAPT / SKIP 計画にしてから取り込みます([上流移行ガイド](docs/guide/18-migrating-upstream-v2.ja.md)参照)。

## ハーネスを選ぶ

エンジン(状態機械・監査ログ・レフェリー)は全ハーネスでバイト単位に同一です。異なるのは外殻だけです。

| ハーネス | インストール(プロジェクトへ) | 起動 | ガイド |
| --- | --- | --- | --- |
| **Kiro IDE** | `bunx @amadeus-dlc/setup install --harness kiro-ide` | `/amadeus` | [Kiro IDE で動かす](docs/guide/harnesses/kiro-ide.ja.md) |
| **Kiro CLI**(≥ 2.6) | `bunx @amadeus-dlc/setup install --harness kiro` | `/amadeus` | [Kiro CLI で動かす](docs/guide/harnesses/kiro-cli.ja.md) |
| **Claude Code** | `bunx @amadeus-dlc/setup install --harness claude` | `/amadeus` | [はじめる](docs/guide/01-getting-started.ja.md) |
| **Codex CLI**(≥ 0.139.0) | `bunx @amadeus-dlc/setup install --harness codex` | `$amadeus` | [Codex CLI で動かす](docs/guide/harnesses/codex-cli.ja.md) |
| **OpenCode** | `bunx @amadeus-dlc/setup install --harness opencode` | `$amadeus` | [OpenCode で動かす](docs/guide/harnesses/opencode.ja.md) |
| **Cursor** | `bunx @amadeus-dlc/setup install --harness cursor` | `/amadeus` | [Cursor で動かす](docs/guide/harnesses/cursor.ja.md) |

> [!NOTE]
> 本リリースは **Claude Opus 4.8** で最もよく動作します(Kiro では有料プランが必要)。より弱いモデルでは、コンダクターが任意ステップ(レビュアーパス、学習リチュアル)を省略したり、承認ゲートを急いだりすることがあります。他モデルでの挙動は改善中です。

## クイックスタート

### 前提条件(全ハーネス共通)

すべてのハーネスは同じ TypeScript の hooks と CLI ツールを **bun** で実行します。まず bun をインストールしてください — 全ハーネス共通の唯一の必須要件です。

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

```powershell
# Windows PowerShell
irm bun.sh/install.ps1 | iex
```

```batch
:: Windows コマンドプロンプト(CMD)— bun のインストーラは PowerShell 専用のため CMD からは以下で呼び出す
powershell -c "irm bun.sh/install.ps1 | iex"
```

Windows では PowerShell と CMD の*どちらか一方*を使ってください(プロンプトが `PS C:\` なら PowerShell、`C:\` のみなら CMD)。すべてネイティブ Windows で動作し、WSL は不要です。Bash ツールを使うハーネスのために [Git for Windows](https://git-scm.com/downloads/win) を推奨します。

> [!TIP]
> bun は*非対話*シェルの PATH に載っている必要があります — ハーネスが hook やツールを実行するのはそのシェルだからです。非対話シェルが読むのは `~/.zshenv`(zsh)や `~/.bashrc`(bash)であって `~/.zshrc` ではありません。しかし bun のインストーラは `~/.zshrc` に書き込みます。ターミナルでは `which bun` が通るのにハーネスが bun を見つけられない場合は、`BUN_INSTALL`/`PATH` の export を `~/.zshenv`(bash・Git Bash は `~/.bashrc`)へコピーしてください。

### ハーネスのインストール

`@amadeus-dlc/setup` がタグ付き配布物を GitHub から取得してプロジェクトへコピーします — `dist/` の手動コピーは不要です。同等の2通りの起動方法があります(`npx` は Node.js ≥ 18.3 で動作し、このコマンドだけなら bun 不要):

```bash
bunx @amadeus-dlc/setup install     # bun
npx @amadeus-dlc/setup install      # npm/node
```

引数なしの `install` は対話ウィザードを起動します: ハーネス(`claude` / `codex` / `kiro` / `kiro-ide` / `opencode` / `cursor`)とターゲットディレクトリを選ぶだけです。スクリプトや CI ではフラグで明示します:

```bash
bunx @amadeus-dlc/setup install --harness claude --target your-project --yes
```

既存インストールの更新は `install` の代わりに `upgrade` を使います(フラグは同じ)。何かに触れる前に diff 形式の計画を表示し、あなたのカスタマイズを保護します:

```bash
bunx @amadeus-dlc/setup upgrade --harness claude --target your-project --yes
```

サブコマンドなしの `amadeus-setup` は常にヘルプを表示するだけで、`install`/`upgrade` が暗黙に実行されることはありません。インストーラに到達できない環境(オフライン・エアギャップ)は[トラブルシューティング](docs/guide/15-troubleshooting.ja.md)の手動コピー手順を参照してください。

すべてのインストールは2つの部品を並べて配置します: ハーネス表層(`.claude/`・`.codex/`・`.kiro/` など)と、エンジンが読む構築済みメソッドツリー `amadeus/spaces/default/memory/` を含む `amadeus/` **ワークスペースシェル**です — これが無いと `/amadeus --doctor` の "workspace shell ready" 検査が失敗します。

<details>
<summary><b>Kiro IDE</b></summary>

**1. Kiro IDE をインストール**してサインインします。

**2. プロジェクトへ Amadeus-DLC をインストール**

```bash
bunx @amadeus-dlc/setup install --harness kiro-ide --target your-project --yes
```

`.kiro/` + `amadeus/`(+ `AGENTS.md`)が `your-project/` にインストールされます。`your-project/` を Kiro IDE で開いてください — `chat.defaultAgent` を `amadeus` に設定した `.kiro/settings/cli.json` と、`.kiro/hooks/*.kiro.hook` 形式のフレームワーク hooks が同梱されています。チャットパネルで `/amadeus --doctor` で検証し、`/amadeus <説明>` で開始します。詳細: [Kiro IDE で動かす](docs/guide/harnesses/kiro-ide.ja.md)。

</details>

<details>
<summary><b>Kiro CLI</b></summary>

**1. Kiro CLI**(≥ 2.6)をインストールしてログイン:

```bash
kiro-cli --version   # ≥ 2.6 を確認
kiro-cli login
```

**2. プロジェクトへ Amadeus-DLC をインストール**

```bash
bunx @amadeus-dlc/setup install --harness kiro --target your-project --yes
cd your-project && kiro-cli chat
```

`chat.defaultAgent` を `amadeus` に設定した `.kiro/settings/cli.json` が同梱されるため、`/amadeus` が既定で有効です。セッション内で `/amadeus --doctor` で検証し、`/amadeus <説明>` で開始します。詳細: [Kiro CLI で動かす](docs/guide/harnesses/kiro-cli.ja.md)。

</details>

<details>
<summary><b>Claude Code</b></summary>

**1. Claude Code をインストール**

```bash
# macOS / Linux(ネイティブインストール — 推奨・自動更新)
curl -fsSL https://claude.ai/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

macOS で Homebrew を使うなら `brew install --cask claude-code`。`claude --version` で確認します。

**2. プロジェクトへ Amadeus-DLC をインストール**

```bash
bunx @amadeus-dlc/setup install --harness claude --target your-project --yes
cp -n your-project/.claude/CLAUDE.md.example your-project/.claude/CLAUDE.md
cp -n your-project/.claude/settings.json.example your-project/.claude/settings.json
cd your-project && claude
```

続けて Claude Code セッション内で:

```
/amadeus --doctor                                               # セットアップを検証
/amadeus Build a task management API with user authentication   # ワークフローを開始
```

同梱の `settings.json.example` はプロバイダーやモデルをピン留めしません — Claude Code は普段の設定をそのまま使います。個人的な上書きは `.claude/settings.local.json` かユーザーレベル設定へ。詳細: [はじめる](docs/guide/01-getting-started.ja.md)。

</details>

<details>
<summary><b>Codex CLI</b></summary>

**1. Codex CLI**(≥ 0.139.0 — それ未満は hook ペイロードに実エージェントロールが載りません)をインストール:

```bash
codex --version   # ≥ 0.139.0 を確認
```

**2. プロジェクトへ Amadeus-DLC をインストール**(プロジェクトは **git リポジトリ**であること — Codex はその中でのみプロジェクトの `.codex/hooks.json` を発見します):

```bash
bunx @amadeus-dlc/setup install --harness codex --target your-project --yes
cp -n your-project/.codex/config.toml.example your-project/.codex/config.toml
bun your-project/.codex/tools/amadeus-codex-hooks.ts activate --project-dir your-project
```

`.codex/` + `.agents/` + `amadeus/` + `AGENTS.md` がインストールされます。Codex hooks には明示的な所有境界があります: `.codex/hooks.json.example` が追跡される正本設定、`.codex/hooks.json` は gitignore されるクローンごとのアクティブファイルです。`activate` はアクティブファイルが無いときだけ作成し、既存のものを上書きしません。検証:

```bash
bun .codex/tools/amadeus-utility.ts doctor
```

オーケストレーターは `$amadeus`(または `/skills` → amadeus)+ スコープか説明で起動します。trust ダイアログ、設定マージ、既存インストールのアップグレード経路、sandbox/git の注意は [Codex ガイド](docs/guide/harnesses/codex-cli.ja.md)が網羅しています。

</details>

<details>
<summary><b>OpenCode</b></summary>

**1. OpenCode をインストール**してプロバイダーにサインインします。

**2. プロジェクトへ Amadeus-DLC をインストール**

```bash
bunx @amadeus-dlc/setup install --harness opencode --target your-project --yes
```

`.opencode/` + `amadeus/`(+ `AGENTS.md`)がインストールされます。ガイドの手順どおり同梱設定を有効化し(プロジェクトに無ければ `.opencode/opencode.json.example` を `.opencode/opencode.json` へコピー)、`$amadeus --doctor` で検証して `$amadeus <説明>` で開始します。詳細: [OpenCode で動かす](docs/guide/harnesses/opencode.ja.md)。

</details>

<details>
<summary><b>Cursor</b></summary>

**1. Cursor をインストール**してサインインします。

**2. プロジェクトへ Amadeus-DLC をインストール**

```bash
bunx @amadeus-dlc/setup install --harness cursor --target your-project --yes
```

`.cursor/` + `amadeus/`(+ `AGENTS.md`)がインストールされます。ガイドの手順どおり同梱 hook 設定を有効化し(プロジェクトに無ければ `.cursor/hooks.json.example` を `.cursor/hooks.json` へコピー)、`/amadeus --doctor` で検証して `/amadeus <説明>` で開始します。詳細: [Cursor で動かす](docs/guide/harnesses/cursor.ja.md)。

</details>

## ドキュメント

読者ごとに3つのガイドがあります — 何を変えたいかで選んでください:

| | 対象 | 内容 |
|---|---|---|
| **[User Guide](docs/guide/00-introduction.ja.md)** | Amadeus **で**ソフトウェアを作る人 | はじめ方、ワークフロー、スコープ、エージェント、インタラクションモード、トラブルシューティング |
| **[Harness Engineer Guide](docs/harness-engineering/00-overview.ja.md)** | Amadeus の**振る舞い**を形作る人 | ステージ、エージェント、スコープ、ルール、センサー、チームナレッジ — コードではなく設定 |
| **[Developer Reference](docs/reference/00-overview.ja.md)** | Amadeus **自体**を変える人 | アーキテクチャ、オーケストレーター、ステージプロトコル、hooks、状態機械、テスト、コントリビュート |

ドキュメント全体の地図は [docs/README.ja.md](docs/README.ja.md) にあります。

## リポジトリ構成

3つのゾーンがあります: フレームワークが**何であるか**、各ハーネスが**どう話すか**、ユーザーが**何をコピーするか**。

```text
amadeus/
│  ─────────── 手書きソース — 編集はここ ───────────
├── packages/
│   ├── framework/
│   │   ├── core/               # ハーネス中立な唯一の正本
│   │   │   ├── tools/          #   amadeus-*.ts エンジンツール(+ data/scaffold/templates)
│   │   │   ├── amadeus-common/ #   ステージプロトコル + ステージファイル + conductor
│   │   │   ├── agents/         #   ドメイン専門家ペルソナ
│   │   │   ├── knowledge/ memory/ scopes/ sensors/ hooks/
│   │   │   ├── skills/         #   セッションスキル
│   │   │   └── templates/      #   オンボーディング雛形 → 各ハーネスの CLAUDE.md / AGENTS.md
│   │   └── harness/            # ハーネスごとの薄い表層 — 小さく、意図的に分岐
│   │       ├── claude/  codex/  cursor/  kiro/  kiro-ide/  opencode/
│   └── setup/                  # @amadeus-dlc/setup — インストーラパッケージ
│
├── scripts/
│   ├── package.ts              # ビルドの入口: manifest に従い core+harness をコピー → graph compile →
│   │                           #   runner-gen → ツリーごとに emit()。--check = 全域ドリフトガード(CI)
│   └── manifest-types.ts       # 共有 manifest 契約
│
│  ─────────── 生成物(コミット・ドリフトガード対象)— 手編集禁止 ───────────
├── dist/
│   ├── claude/    kiro-ide/    kiro/      # 各ハーネスのユーザーがコピーするもの
│   ├── codex/     opencode/    cursor/
│
│  ─────────── 支援 ───────────
├── tests/                      # 全 TypeScript のテストスイート(t*.test.ts)
├── docs/                       # guide/ · harness-engineering/ · reference/
└── book-pack/                  # ローカルドメインパック(書籍執筆)— 非出荷
```

> `packages/framework/core/` がフレームワークの**本体**、`packages/framework/harness/` が各ハーネスの**話し方**、`dist/` がユーザーの**コピーするもの**です。編集するのはフレームワークソースだけ — `bun scripts/package.ts` が `dist/` を再生成し、`dist/` の手編集は CI が落とします。

フレームワークソースは `packages/setup`(インストーラ)のような兄弟パッケージと並ぶよう `packages/framework/` 配下にあります。root の `scripts/` と `dist/` はリポジトリレベルのビルド入口・公開インストール契約として維持されます。背景とトレードオフは [Workspace Layout Decision](docs/reference/18-workspace-layout.ja.md) に記録されています。

## ハーネスのビルド / 再生成

メンテナは `packages/framework/core/`(またはハーネス表層 `packages/framework/harness/<name>/`)の手書きソースを編集し、コミット対象の `dist/<harness>/` ツリーを再生成します — **`dist/` は絶対に手編集しない**こと。ドリフトガードが CI を落とします。

```bash
bun run dist                    # core + harness から全 dist/<harness>/ を再生成
bun scripts/package.ts <name>   # 1ハーネスのみ再生成(例: claude, kiro-ide, codex)
bun run dist:check              # バイトパリティのドリフトガード(CI で実行)
bun run promote:self            # このリポジトリ自身のセルフインストールを更新
bun run promote:self:check      # セルフインストールのドリフトガード
```

新しいハーネスの追加は [Porting to a New Harness](docs/harness-engineering/09-porting-to-a-new-harness.ja.md) を、ビルドの正式なリファレンスは [Contributing Guide](docs/reference/11-contributing.ja.md) を参照してください。

## テスト

```bash
bun tests/run-tests.ts               # 既定: smoke + unit + integration
bun tests/run-tests.ts --ci          # smoke + unit + integration
bun tests/run-tests.ts --release     # + e2e(フル受け入れ)
bash tests/run-tests.sh --ci         # POSIX 互換ラッパー
```

テスト戦略の全体とテストレジストリは [Testing Reference](docs/reference/09-testing.ja.md) を参照してください。

## トラブルシューティング

初回のつまずきはほとんど以下のいずれかです。それ以外は各ハーネスガイドが扱います。

| 症状 | ハーネス | 対処 |
| --- | --- | --- |
| ターミナルでは `which bun` が通るのにハーネスが bun を見つけられない | 全部 | bun が非対話 PATH に無い。`BUN_INSTALL`/`PATH` の export を `~/.zshenv`(bash/Git Bash は `~/.bashrc`)へコピー — [クイックスタート](#クイックスタート)の TIP 参照 |
| `/amadeus --doctor` が Codex CLI のバージョン不足(< 0.139.0)を報告する | Codex | Codex CLI 0.139.0 以降へ更新。旧版はサブエージェントの帰属とハイフン付きエージェント TOML の解決が壊れます |
| モデル/プロバイダー呼び出しが認証エラーや model-not-found になる | Claude、Codex | CLI のプロバイダー認証情報とモデルアクセスを確認。プロジェクトローカルの上書きを意図的に使っている場合は、そのファイルの存在と内容を確認 |
| hooks が一切発火しない(監査行もゲートも出ない) | Codex | hooks を信頼する: `bun scripts/package.ts codex trust --project <dir>` を実行するか、TUI セッションを1回起動して "Trust all" を選択。未信頼の hooks は実行されません |
| 新しい `dist/` をコピーしたのにスキルやルールが効かない | 全部 | 新しいセッションを開始する — ハーネスはスキル・エージェント・ルールをセッション開始時に読み込みます |

## コントリビュート

前提条件、ワークフロー、提出プロセスは [Contributing Guide](docs/reference/11-contributing.ja.md) を参照してください。

## 出自と謝辞

本プロジェクトが実装する **AI-DLC メソドロジー**(段階的・ゲート付きの AI 駆動開発アプローチ)は AWS が定義したものです。メソドロジー自体は [AI-DLC ブログ記事](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)と [Method Definition Paper](https://prod.d13rzhkk8cj2z0.amplifyapp.com/) を参照してください。

Amadeus-DLC は [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)(AI-DLC v2)のフォークとして出発し、その出発点に多くを負っています。以来、独自のエンジン・パッケージング・インストーラ・拡張を備えた独立の実装として、このリポジトリで独自のロードマップの下に開発されています。上流のリリースは今もレビューされ、証拠に基づく ADOPT / ADAPT / SKIP プロセスで選択的に取り込まれます — [上流 v2 からの移行](docs/guide/18-migrating-upstream-v2.ja.md)参照。

生成 AI は間違えます。このフレームワークをどのモデル・どのハーネスで動かすにせよ、出力とコストは確認してください。承認ゲートは「人間が見ていないものは何も出荷されない」ためにあります。

## ライセンス

以下のいずれかを選択できるデュアルライセンスです:

- [MIT License](LICENSE-MIT)
- [Apache License, Version 2.0](LICENSE-APACHE)
