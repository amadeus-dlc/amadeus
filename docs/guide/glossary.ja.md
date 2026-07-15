# 用語集

> 言語: [English](glossary.md) | **日本語**

AI-DLC 用語の正典的定義。ユーザーガイドと Developer Reference のすべての
ドキュメントは、これらの用語を一貫して使用します。

---

| 用語 | 定義 |
|------|-----------|
| **Agent(エージェント)** | オーケストレーターがステージ中にアクティブ化する、11 のドメインエキスパートペルソナの 1 つ(例: amadeus-product-agent、amadeus-architect-agent)。各エージェントは専門的な視点と知識セットをもたらします。 |
| **Approval gate(承認ゲート)** | 各ステージの終わりにある対話的なチェックポイント。作業を承認するか、変更を要求するか、(3 回の改訂後に)そのまま受け入れるかを選びます。Initialization ステージは承認ゲートをスキップします。 |
| **Autonomy mode(自律モード)** | walking-skeleton のラダープロンプト後に `amadeus-state.md`(`Construction Autonomy Mode`)に記録される設定。`autonomous`(後続の Bolt はゲートなしで実行)または `gated`(各 Bolt が承認を求める)のいずれか。プロンプト前は `unset` がデフォルト。 |
| **Bolt** | Construction 実行の単位: 1 つの Unit(または依存関係でリンクされた小さな Unit グループ)についてステージ 3.1–3.5 を 1 回通過すること。ステージ 3.6(Build and Test)と 3.7(CI Pipeline)は、Bolt ごとではなくすべての Bolt 完了後に 1 回実行されます。Construction の最初の Bolt が walking skeleton です。参照: [parallel batch]、[walking skeleton]、[ladder prompt]。 注: これは AI-DLC v1 からの意図的な逸脱です。v1 では Bolt は sprint 相当のタイムボックス(Unit of Work が複数の Bolt にまたがる)を指しますが、本実装では Bolt を1つ以上の Unit of Work を包む deployable slice の意味に意図的に転用しています。 |
| **Artifact(成果物)** | ステージが生成し、intent のレコードディレクトリ(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)に保存されるバージョン管理された markdown ドキュメント。例: `requirements.md`、`code-summary.md`、`initiative-brief.md`。 |
| **Audit trail(監査証跡)** | intent のレコードディレクトリ内 `audit/` にある append-only のイベントログ。per-clone シャード(`<host>-<clone>.md`)として書かれ、読み手が glob してタイムスタンプでマージします。intent から本番までの完全なトレーサビリティのため、68 種類のイベントタイプを ISO タイムスタンプ付きで記録します。 |
| **CLI tool(CLI ツール)** | この実装が必要とする外部のコマンドラインユーティリティ(`bun` が唯一のランタイム前提条件)。Claude Code ツールと混同しないでください。 |
| **Claude Code tool(Claude Code ツール)** | Read、Write、Edit、Bash、Glob、Grep、Task、AskUserQuestion などの組み込み Claude Code 機能。エージェントはデフォルトでセッションのフルツールセットを継承します。任意の `tools:` allowlist で絞り込め、`disallowedTools: Task` が同梱される唯一の制限です。 |
| **Codex** | OpenAI Codex CLI ハーネス — 今日の AI-DLC のハーネスディストリビューションの 1 つで、`core/` + `harness/codex/` から `dist/codex/` に生成されます。`$amadeus` で起動します。[Codex CLI 上の AI-DLC](harnesses/codex-cli.ja.md) を参照。 |
| **Command(コマンド)** | AI-DLC のユーザー向け起動。`/amadeus` の後にスコープ、フラグ、または自由記述を続けてタイプします。内部的に `/amadeus` は Claude Code スキルにマップされます。 |
| **Compaction** | コンテキストウィンドウが満杯になったときに、以前の会話コンテキストを要約する Claude Code の自動プロセス。この実装は `amadeus-state.md` と `.amadeus-recovery.md` を介して compaction をまたいで状態を保持します。 |
| **Conductor(コンダクター)** | `/amadeus` セッション自体(`SKILL.md`)。薄い転送ループを実行します: **Engine** に次の手を求め、それを実行し(ステージ実行、質問、swarm の fan-out)、結果を報告し、繰り返します。ルーティングではなく実行品質を所有します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Control loop(制御ループ)** | ステージを方向づけ検証する、**Rules**(作業前に適用される standing decision)と **Sensors**(出力に対して発火する決定論的チェック)のフィードフォワード/フィードバックのペアリング。(**Harness** とは別物です — こちらは CLI ディストリビューションの意味。両者はかつてどちらも「harness」と呼ばれていました。) |
| **Core** | `core/` にある手作業で作成されたハーネス中立なソースオブトゥルース — エンジン、ステージ、エージェント、ルール、スコープ、センサー、knowledge、フック、セッションスキル。すべてのハーネスディストリビューションはそこから生成されます。ここで編集し、`dist/` では決して編集しません。 |
| **Depth(深さ)** | 各ステージが生成する詳細の量を制御する 3 つの詳細レベル(Minimal、Standard、Comprehensive)の 1 つ。スコープにはデフォルトの深さがあり、任意の承認ゲートで上書きできます。[スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md) を参照。 |
| **Directive(ディレクティブ)** | **Engine** が各 `next` で発行する型付き命令(例: `run-stage`、`ask`、`print`、`done`、`invoke-swarm`)。**Conductor** に次に何をするかを正確に伝えます。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Distribution(ディストリビューション)** | 1 つのハーネス用の、生成・コミット・ドリフトガードされた `dist/<harness>/` ツリー(例: `dist/claude/`、`dist/kiro/`、`dist/codex/`)。ユーザーはそれをプロジェクトにコピーし、メンテナは決して手編集しません。**Packager** が **Core** から生成します。 |
| **Engine(エンジン)** | ステージ間ルーティングをすべて所有する決定論的オーケストレーションツール(`amadeus-orchestrate.ts`、サブコマンド `next`/`report`) — スコープ解決、ステージ順序付け、ジャンプ、resume、ゲート状態 — し、**Conductor** が従う型付き **Directive** を発行します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **External tool(外部ツール)** | ステージが使うサードパーティのツールやサービス(例: AWS CLI、Maven、npm)。Claude Code ツールとは区別されます。 |
| **Guardrail(ガードレール)** | Rule ファイル内の本文セクション(`## Forbidden`、`## Mandated`、およびフェーズルールのガードレール見出し)で、規範的な振る舞いの制約を表現します。コンテナが Rule であり、「guardrail」はその中の規範的な内容を指します。**Rule** を参照。 |
| **Harness(ハーネス)** | AI-DLC コアの CLI ディストリビューション — ハーネス中立な **Core** がレンダリングされる、1 つの有能なコマンドラインエージェント。このセットはオープンで成長可能です(今日: Claude Code、Kiro CLI、Codex CLI)。*注 — このリポジトリでは「harness」は文脈によって 4 つの意味を持ちます:* (1) **この正典的な CLI ディストリビューションの意味**; (2) rule+sensor の **control loop**(古い用法、現在は改名 — **Control loop** を参照); (3) `harness/<name>/` のソースサーフェスディレクトリ; (4) `tests/harness/` のテストヘルパーディレクトリ。ユーザードキュメントで「a harness」と言えるのは意味 1 だけです。 |
| **Hook(フック)** | Claude Code がイベントに応じて自動実行する TypeScript スクリプト。この実装は 11 個のフックを使い、すべて `settings.json` にプロジェクト全体で登録されます: ワークフローの背骨(監査ログ、センサーディスパッチ、runtime-graph コンパイル、statusline 同期、compaction 時の状態検証、サブエージェント追跡、ターン終了時のループ強制)に加えて、セッションライフサイクル(resume コンテキスト、session-end 監査)、プロンプト送信時の human-turn mint、statusline コマンド。各々は自己ゲートし、アクティブなワークフローがなければ no-op します。 |
| **Inline execution(インライン実行)** | オーケストレーターがエージェントペルソナをロードし、会話内で直接ステージを実行するデフォルトの実行モード。リアルタイムのユーザー対話をサポートします。 |
| **Intent** | space の `intents.json` レジストリの行(`{uuid, slug, dirName, scope, repos, status}`)として追跡される作業の単位。独自の [Record dir] を `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` に持ちます。`<YYMMDD>` はコンパクトな UTC 日付接頭辞(例: `260624` = 2026-06-24)でレコードが時系列にソートされ、`<label>` はリクエストの短い kebab-case のエッセンスです。同日・同ラベルの衝突は数値カウンタ(`-2`、`-3`、…)で解決します。正典的で衝突しない id は、ディレクトリ接尾辞ではなくレジストリ行に格納された時間順序 UUIDv7 です。エンジンは最初の `/amadeus` で最初の intent を auto-birth します。`active-intent` ポインタが現在のものを選択します。**Space**、**Record dir** を参照。 |
| **Kiro** | Kiro ハーネス — 今日の AI-DLC のハーネスディストリビューションの 1 つで、`core/` から `dist/kiro/`(CLI)と `dist/kiro-ide/`(IDE)に生成され、AIDLC メソッドは Kiro のエージェントリソース glob 経由で `amadeus/spaces/<space>/memory/` から読まれます。`/amadeus` で起動します。[Kiro IDE で AI-DLC を実行する](harnesses/kiro-ide.ja.md) と [Kiro CLI で AI-DLC を実行する](harnesses/kiro-cli.ja.md) を参照。 |
| **Knowledge** | ステージ開始時にエージェントがロードする参照資料。2 階層: 方法論 knowledge(フレームワークに `.claude/knowledge/` として同梱)とチーム knowledge(ユーザー管理、space レベルのドメイン knowledge、`amadeus/spaces/<space>/knowledge/` — 自由形式、ブートストラップ時は空、space 内のすべての intent で共有)。 |
| **Ladder prompt(ラダープロンプト)** | walking-skeleton Bolt の終わりに表示される単一のプロンプト。「continue autonomously」か「gate every Bolt」を選ぶよう求めます。あなたの選択は autonomy mode として記録され、残りすべての Bolt を統治します。 |
| **Learning loop(学習ループ)** | ステージ内の是正を持続的なプラクティスとセンサーに変える v0.5.0 のメカニズム。ステージ中にオーケストレーターは観察を `memory.md` に記録し、承認ゲートでそれらを表面化させ、どれを残すかをあなたが確認します。確認された各学習は space メモリレイヤー(`amadeus/spaces/<space>/memory/project.md`、ワンクリックで `memory/team.md` に昇格)にプラクティスとして書かれる — または新しいセンサーを scaffold する — ため、次のワークフローで適用されます。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Lifecycle(ライフサイクル)** | AI-DLC 方法論の全体: AI-Driven Development Life Cycle。方法論の 1 回の実行がワークフローです。 |
| **Manifest** | ハーネスの `harness/<name>/manifest.ts` — **Packager** に **Core** をそのハーネスの **Distribution** にどう投影するかを伝える宣言的契約(ディレクトリマップ、rules のリネーム、作成されたファイル、任意の `emit` プラグイン)。ハーネスの追加はほぼ 1 つの manifest を書くことです。 |
| **MCP server(MCP サーバー)** | プロジェクトまたはユーザーのハーネス設定で宣言され、セッションにプロビジョニングされる外部ツールサーバー。この実装はデフォルトでプロジェクト MCP サーバーを同梱しません。すべてのエージェントはすべてのセッション MCP サーバーを継承します — per-agent の付与はありません。エージェントがそれを使うのを *防ぐ* には、その `tools:` allowlist を特定の `mcp__<server>__<tool>` id に絞り込みます。認証情報のないサーバーは単に利用不可で、ワークフローを決してブロックしません。[ハーネスプリミティブのマッピング — MCP Servers](../reference/14-claude-features.ja.md#mcp-servers) と [はじめに](01-getting-started.ja.md#mcp-servers-optional) を参照。 |
| **memory.md** | `<record>/<phase>/<stage>/memory.md`(intent のレコードディレクトリ配下)にある per-stage の観察日記。ステージ開始時に自動作成され、オーケストレーターが保守します(手編集しません)。Interpretations、Deviations、Tradeoffs、Open questions を記録します。承認ゲートで学習ループが読む入力です。 |
| **Multi-repo intent** | 作業が複数の兄弟コードリポジトリにまたがる intent。リポジトリセットは誕生時に捕捉されます — 明示的に `--repos a,b` で、または兄弟の自動発見(`.git` を持つワークスペースルートのすべての直下の子)で — し、intent の `intents.json` 行に `repos` として格納されます。Construction は各 git 操作を `--repo <name>` で特定のリポジトリにアンカーします。記録されたリポジトリのない intent はレガシーな単一リポジトリのケースです(git はプロジェクトディレクトリで実行)。[成果物リファレンス](14-artifacts-reference.ja.md) を参照。 |
| **Orchestrator(オーケストレーター)** | ワークフローがどう駆動されるかの包括的な用語: 次に何が起こるかを決める決定論的な **Engine** と、それを実行する **Conductor**(`SKILL.md`)。`/amadeus` 経由で起動します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Packager(パッケージャ)** | `scripts/package.ts` — **Core** + 各 **Manifest** からすべての `dist/<harness>/` **Distribution** を再生成するビルド。`bun scripts/package.ts` がすべてをビルドし、`--check` は CI で実行されるバイトパリティのドリフトガードです。 |
| **Parallel batch(並列バッチ)** | 依存関係が満たされ、互いに依存しない Bolt のグループで、オーケストレーターによって並行実行されます。バッチの終わりの単一の承認ゲートがその中のすべての Bolt をカバーします。 |
| **Phase(フェーズ)** | ライフサイクルの 5 つの主要区分の 1 つ: Initialization(0)、Ideation(1)、Inception(2)、Construction(3)、Operation(4)。各フェーズは 3〜8 のステージを含みます(Initialization 3、Ideation 7、Inception 8、Construction 7、Operation 7)。 |
| **Phase boundary verification(フェーズ境界検証)** | フェーズ遷移時に実行される自動トレーサビリティチェック。下流のステージがそれらの上に構築する前に、欠落したリンク、孤児化した成果物、不整合を捕捉します。 |
| **Plane(プレーン)** | ネットワークアーキテクチャから借用した、フレームワークが分離する 3 つの関心事の 1 つ: **control plane**(ステージ定義、Rules、Sensors — 何が実行されるべきかのスキーマ、コンパイル時に解決)、**data plane**(実際のステージ実行、Bolt、監査テレメトリ)、**management plane**(`/amadeus --doctor`、監査クエリ、`CLAUDE.md`)。ユーザー向けのオリエンテーションは [ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を、完全なモデルは `docs/reference/02-plane-architecture.md` を参照。 |
| **Record dir(レコードディレクトリ)** | 1 つの intent の成果物、per-stage の `memory.md` 日記、`amadeus-state.md`、`audit/` シャードを保持する per-intent ディレクトリ: `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(`<record>/` と表記)。各 intent が独自に持ち、アクティブなものは `active-intent` ポインタで選択されます。**Space**、**Intent** を参照。 |
| **Recovery breadcrumb** | PreCompact フックが書く隠しファイル `.amadeus-recovery.md`。compaction 後の状態破損検出のため、最後に検証されたステージとタイムスタンプを含みます。 |
| **Reviewer(レビュアー)** | 品質ゲートエージェント — `amadeus-product-lead-agent`(requirements/stories/mockups)または `amadeus-architecture-reviewer-agent`(技術設計) — で、ステージが `reviewer:` フィールドを宣言するとき、ステージ本体が成果物を生成した後に別のサブエージェントとして起動されます。プライマリ成果物に `## Review` の判定(READY / NOT-READY)を追記します。NOT-READY の場合、ビルダーが再実行し、`reviewer_max_iterations`(デフォルト 2)まで繰り返してから、未解決の指摘を人間の承認ゲートで提示します。決してブロックしません — 常に人間が決めます。[エージェント](06-agents.ja.md) を参照。 |
| **Rule(ルール)** | ワークスペースルートの space メモリレイヤー(`amadeus/spaces/<space>/memory/`)に一度作成され、各ハーネスのネイティブなインクルード(Claude の `@`-import スタブ、Kiro のリソース glob、Codex の `AMADEUS_RULES_DIR`)でコンテキストに取り込まれる持続的な振る舞いのルール。それがカバーするすべてのステージに適用されます。ルールは strict-additive な 5 レイヤーチェーン — org → team → project → phase → stage — を通じて解決され、該当するすべてのルールがコンテキストに現れます。より広いレイヤーは決して上書きされず、追加されるだけです。ルールは **control loop** のフィードフォワード側で、決定論的検証のためにセンサーとペアになることがあります。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Runtime graph(ランタイムグラフ)** | intent のレコードディレクトリ内の per-workflow な `runtime-graph.json` 成果物: 構造的ステージグラフの data-plane ミラーで、承認ゲートごとに監査ログから具現化されます。どのステージが実行されたか、どの Bolt がフォークしたか、どのセンサーが発火したか、`memory.md` のエントリ数を記録します — doctor と学習ループが読むクエリ可能な実行ビューです。 |
| **Scope(スコープ)** | どのステージがどの深さで実行されるかを決める 10 個の名前付き設定(enterprise、feature、mvp、poc、bugfix、chore、refactor、infra、security-patch、workshop)の 1 つ。自由記述の intent から自動検出することもできます。 |
| **Sensor(センサー)** | `.claude/sensors/` の manifest で定義される決定論的な検証チェック(例: `amadeus-linter.md`、`amadeus-type-check.md`)。センサーは PostToolUse フック経由でステージの出力への Write/Edit で発火し、advisory な `SENSOR_*` 監査行を記録します — ワークフローを決してブロックしません。ステージは `sensors:` frontmatter リストでどのセンサーが発火するかを宣言します。センサーは **control loop** のフィードバック側で、ルールがフィードフォワード側です。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Test strategy(テスト戦略)** | 生成されるテストの数と含まれるテストタイプを制御する 3 つのテストボリュームレベル(Minimal、Standard、Comprehensive)の 1 つ。深さとは独立 — スコープが独自のデフォルトを宣言しない限り深さレベルにデフォルトします(例: workshop は Minimal がデフォルト)。[スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md#the-3-test-strategy-levels) を参照。 |
| **Session(セッション)** | `/amadeus` を実行する 1 つの Claude Code 会話。ワークフローは resume メカニズムを介して複数のセッションにまたがることがあります。 |
| **Skill(スキル)** | Claude Code のプリミティブ: スラッシュコマンドを登録する YAML frontmatter 付きの markdown ファイル。AI-DLC のオーケストレーターは `/amadeus` スキルとして実装されています。ユーザー向けドキュメントでは「skill」より「command」を優先します。 |
| **Space(スペース)** | `amadeus/spaces/<space>/` にある per-team のワークスペースで、独自の `memory/`、`knowledge/`、intent レコード(`intents/`)を保持します。アクティブな space は gitignore された `amadeus/active-space` ポインタで解決され、`default` にデフォルトします。単一チームのユーザーは `spaces/default/` しか見ません。**Intent**、**Knowledge** を参照。 |
| **Stage(ステージ)** | ライフサイクル内の 32 の個別ステップの 1 つ。各ステージにはリードエージェント、定義された入出力があり、ステージプロトコルに従います。ステージはフェーズごとに番号付けされます(例: 1.1、2.4、3.5)。 |
| **State file(状態ファイル)** | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/amadeus-state.md`(intent のレコードディレクトリ配下)にある持続的な per-intent ワークフロー状態。6 状態のチェックボックス(`[ ]` / `[-]` / `[?]` / `[R]` / `[x]` / `[S]`)を使って、ステージの進捗、スコープ、ワークスペースコンテキスト、セッション resume 情報を追跡します。 |
| **Subagent execution(サブエージェント実行)** | オーケストレーターが Task ツール経由でステージ作業を別の Claude Code サブプロセスに委譲する実行モード。サブエージェントはユーザー対話なしで自律的に実行します。ステージ 2.1(reverse-engineering)と 3.5(code-generation)で使われます。 |
| **Unit of work(作業単位)** | ステージ 2.7(Units Generation)で分解される、独立して実装可能なソリューションの一片。1 つ以上の Unit が Construction のために Bolt にまとめられます。 |
| **Walking skeleton** | Construction の最初の Bolt — すべての統合点を実行する最も薄いエンドツーエンドのスライス。残りの Construction が実行される前に全体の形を確認できるよう、常にゲートされ対話的です。ラダープロンプトは承認直後に発火します。 |
| **Utility command(ユーティリティコマンド)** | `/amadeus` に渡される非ワークフローのフラグ(`--status`、`--doctor`、`--version`、`--stage`、`--phase`、`--scope` など)。フルワークフローを実行せずに特定の操作を行います。 |
| **Workflow(ワークフロー)** | `/amadeus` の起動からステージ完了までの、AI-DLC ライフサイクルの 1 回のエンドツーエンド実行。特定のタスク(feature、bugfix など)にスコープされます。 |
