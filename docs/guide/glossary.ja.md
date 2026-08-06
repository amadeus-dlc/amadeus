# 用語集

> 言語: [English](glossary.md) | **日本語**

AI-DLC 用語の正典的定義。ユーザーガイドと Developer Reference のすべての
ドキュメントは、これらの用語を一貫して使用します。

この表はリポジトリ内のすべての用語定義の唯一の持ち主です。ステージプロトコルの
Terminology 表、Developer Reference の Terminology 表、`packages/framework/core/knowledge/amadeus-shared/`
に同梱されるエージェント向け用語集は、すべてここから生成されます。編集は常にここで行い、
生成先では行いません。どの用語がどの面に届くかは、英語版 `glossary.md` の
`## Projection Manifest` セクションが宣言します。

## 表記規則

用語集の見出しでは英語名を先頭大文字で示しますが、日本語の本文では次の表記を使用します。

| 概念 | 本文で使う表記 | 許容する表記 | 避ける表記 |
|---|---|---|---|
| Intent | `intent` | 固有のステージ名・画面表示・引用内の `Intent`(例: `Intent Capture`) | カタカナの「インテント」、一般名詞としての `Intent` |
| Space | `space` | 日本語で概念を説明するときの「スペース」、固有の見出し・画面表示・引用内の `Space` | 一般名詞としての `Space` |
| コマンド | `コマンド` | 実装を説明するときの「サブコマンド」 | CLI の command / subcommand を直訳した「動詞」 |
| Lifecycle record | 「ライフサイクルレコード」(常に完全形) | コード識別子としての `lifecycleRecord` | 単独の「レコード」— intent の Record dir と衝突する |
| Self fix | `self-fix` | 説明文中の「Self Fix」 | 「Amadeus Fix」「Amadeus Bugfix」「メンテナンス」 |
| Self feature | `self-feature` | 説明文中の「Self Feature」 | 「enhancement」「改善」 |
| Self refactor | `self-refactor` | 説明文中の「Self Refactor」 | 「クリーンアップ」「書き直し」 |
| Self document | `self-document` | 説明文中の「Self Document」 | 「Amadeus Document」「docs chore」 |

コード、コマンド、パス、識別子、ファイル名、イベント名は、実装上の大文字・小文字をそのまま記述します。

---

| 用語 | 定義 |
|------|-----------|
| **Agent(エージェント)** | オーケストレーターがステージ中にアクティブ化する、11 のドメインエキスパートペルソナの 1 つ(例: amadeus-product-agent、amadeus-architect-agent)。各エージェントは専門的な視点と知識セットをもたらします。 |
| **agmsg** | チームモードで使うエージェント間メッセージングの skill(送信 / 受信箱 / ack)。未登録の宛先でも成功が返るため不達が無音になり、対応を求めるメッセージは必ず ack とセットで運用します。 |
| **AIDLC** | AI-Driven Development Life Cycle — このシステムが実装する方法論。**Lifecycle** を参照。 |
| **Approval gate(承認ゲート)** | 各ステージの終わりにある対話的なチェックポイント。作業を承認するか、変更を要求するか、(3 回の改訂後に)そのまま受け入れるかを選びます。Initialization ステージは承認ゲートをスキップします。 |
| **Autonomy mode(自律レベル)** | intent auditを正本として記録する`none / semi / full`の選択。`none`（既定）はgateも質問も人間が裁定し、`semi`はphase内gateを自動承認し、質問は`full`と同じ解決ラダーで無人裁定（`AUTO_DECIDED`として記録）して節目（phase境界・walking skeleton・intent終端）だけを人間へ戻し、`full`は人間が発行したintent-scoped grantの範囲でintent完了までgateと質問を裁定する。headless起動や旧`unset/gated/autonomous`だけでは昇格しない。 |
| **Blind distribution(blind 配布)** | 提案者の推奨や先行票を伏せて選挙候補を配ること。各投票者が独立に判断できるようにするためで、推奨と先行票は開票後に公開します。 |
| **Bolt** | Construction 実行の単位: 1 つの Unit(または依存関係でリンクされた小さな Unit グループ)についてステージ 3.1–3.5 を 1 回通過すること。ステージ 3.6(Build and Test)と 3.7(CI Pipeline)は、Bolt ごとではなくすべての Bolt 完了後に 1 回実行されます。Construction の最初の Bolt が walking skeleton です。参照: [parallel batch]、[walking skeleton]、[autonomy mode]。 注: これは AI-DLC v1 からの意図的な逸脱です。v1 では Bolt は sprint 相当のタイムボックス(Unit of Work が複数の Bolt にまたがる)を指しますが、本実装では Bolt を1つ以上の Unit of Work を包む deployable slice の意味に意図的に転用しています。 |
| **Builder(ビルダー)** | Unit を実装するチームモードの帽子 — コードを書き、検証を実行し、結果を報告します。自分の実装を自分でレビューすることはありません。**Conductor**、**Reviewer**、**Leader** を参照。 |
| **Artifact(成果物)** | ステージが生成し、intent のレコードディレクトリ(`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)に保存されるバージョン管理された markdown ドキュメント。例: `requirements.md`、`code-summary.md`、`initiative-brief.md`。 |
| **Audit trail(監査証跡)** | intent のレコードディレクトリ内 `audit/` にある append-only のイベントログ。per-clone の JSONL シャード(`<host>-<clone>.jsonl`)として書かれ、読み手が glob してタイムスタンプでマージします。intent から本番までの完全なトレーサビリティのため、正準イベントタクソノミーを ISO タイムスタンプ付きで記録します。 |
| **Checkpoint commit(チェックポイントコミット)** | ワークフローのパーク時、ステージ完了時、セッション終了時に `amadeus/` ツリー(record、memory、codekb、knowledge)をコミットする運用。 |
| **cid** | Rule の各行に付く安定したアンカーコメント(`<!-- cid:<stage>:<slug> -->`)。裁定やレビューはこの cid でルールを参照します。 |
| **CLI tool(CLI ツール)** | この実装が必要とする外部のコマンドラインユーティリティ(`bun` が唯一のランタイム前提条件)。Claude Code ツールと混同しないでください。 |
| **Claude Code tool(Claude Code ツール)** | Read、Write、Edit、Bash、Glob、Grep、Task、AskUserQuestion などの組み込み Claude Code 機能。エージェントはデフォルトでセッションのフルツールセットを継承します。任意の `tools:` allowlist で絞り込め、`disallowedTools: Task` が同梱される唯一の制限です。 |
| **codekb** | `amadeus/spaces/<space>/codekb/<repo>/` にある per-repo のコード知識ベース。Reverse Engineering ステージが生成・差分リフレッシュし、既存コードベースの理解を必要とする後続ステージが読みます。 |
| **Codex** | OpenAI Codex CLI ハーネス — 今日の AI-DLC のハーネスディストリビューションの 1 つで、`packages/framework/core/` + `packages/framework/harness/codex/` から `dist/codex/` に生成されます。`$amadeus` で起動します。[Codex CLI 上の AI-DLC](harnesses/codex-cli.ja.md) を参照。 |
| **Command(コマンド)** | AI-DLC のユーザー向け起動。`/amadeus` の後にスコープ、フラグ、または自由記述を続けてタイプします。内部的に `/amadeus` は Claude Code スキルにマップされます。 |
| **Compaction** | コンテキストウィンドウが満杯になったときに、以前の会話コンテキストを要約する Claude Code の自動プロセス。この実装は `amadeus-state.md` と `.amadeus-recovery.md` を介して compaction をまたいで状態を保持します。 |
| **Component(コンポーネント)** | モジュール内の論理的な構成要素(クラス、関数グループ、UI コンポーネント)。 |
| **Conductor(コンダクター)** | `/amadeus` セッション自体(`SKILL.md`)。薄い転送ループを実行します: **Engine** に次の手を求め、それを実行し(ステージ実行、質問、swarm の fan-out)、結果を報告し、繰り返します。ルーティングではなく実行品質を所有します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Control loop(制御ループ)** | ステージを方向づけ検証する、**Rules**(作業前に適用される standing decision)と **Sensors**(出力に対して発火する決定論的チェック)のフィードフォワード/フィードバックのペアリング。(**Harness** とは別物です — こちらは CLI ディストリビューションの意味。) |
| **Core** | `packages/framework/core/` にある手作業で作成されたハーネス中立なソースオブトゥルース — エンジン、ステージ、エージェント、ルール、スコープ、センサー、knowledge、フック、セッションスキル。すべてのハーネスディストリビューションはそこから生成されます。ここで編集し、`dist/` では決して編集しません。 |
| **Cross-review(クロスレビュー)** | 起票者以外のレビュアーによる Issue の独立検証。各レビュアーは自分でコードを開いて突き合わせ、自分が得たエビデンスを記録します。起票文の要約・追認は検証に数えません。 |
| **Delegated approval(委任承認)** | leader セッションに記録された実 HUMAN_TURN を根拠に、遠隔の conductor がゲート承認をコミットできるようにする provenance 機構。ゲート自体は緩めません。 |
| **Depth(深さ)** | 各ステージが生成する詳細の量を制御する 3 つの詳細レベル(Minimal、Standard、Comprehensive)の 1 つ。スコープにはデフォルトの深さがあり、任意の承認ゲートで上書きできます。[スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md) を参照。 |
| **deslop** | Pull Request を出す前に実行するパス。AI slop(不要なコメント、過剰防御の分岐、周辺コードと不整合なパターン)を挙動を変えずに除去します。 |
| **Directive(ディレクティブ)** | **Engine** が各 `next` で発行する型付き命令(例: `run-stage`、`ask`、`print`、`done`、`invoke-swarm`)。**Conductor** に次に何をするかを正確に伝えます。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Distillation round(蒸留ラウンド)** | 週次のローリング・ポストモーテムに統合されたノルムの棚卸し。高チャーンのルールを機械化・一般化・退役・維持のいずれかへ裁定します。 |
| **Distribution(ディストリビューション)** | 1つのハーネス用に生成される `dist/<harness>/` ツリー(例: `dist/claude/`、`dist/kiro/`、`dist/codex/`)。source repositoryでは未追跡で使い捨てのローカルbuild出力です。release CIがclean checkoutからbuildし、全ハーネスをバージョン付きGitHub Release Assetとして公開します。**Packager** が **Core** から生成します。 |
| **E-code** | 個々の選挙とその裁定に付く識別子(例: `E-PM10`)。成果物は裁定を E-code で参照します。 |
| **Election(選挙)** | 判断を要する事項を、単独の決定者ではなく独立した投票で裁定する仕組み。実施は選挙 CLI の typed directive loop が担います。**Gradients of Agreement**、**Blind distribution** を参照。 |
| **Engine(エンジン)** | ステージ間ルーティングをすべて所有する決定論的オーケストレーションツール(`amadeus-orchestrate.ts`、サブコマンド `next`/`report`) — スコープ解決、ステージ順序付け、ジャンプ、resume、ゲート状態 — し、**Conductor** が従う型付き **Directive** を発行します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **Escalation canonical list(エスカレーション正準リスト)** | 選挙ではなく人間へ委ねる事項の確定列挙: 可否同数、マージ判断、人間の関与が本質である事項、仕様変更。 |
| **External tool(外部ツール)** | ステージが使うサードパーティのツールやサービス(例: AWS CLI、Maven、npm)。Claude Code ツールとは区別されます。 |
| **Falling proof(落ちる実証)** | 新設したゲート・チェック・検証スクリプトが、失敗ケースの注入で実際に赤くなることの実証。赤を実測するまでは完成扱いにしません。 |
| **Generation(生成)** | 実行可能コードを生成するステージ(Code Generation、Build and Test)。**Planning** と対。 |
| **Gradients of Agreement(合意度スケール)** | すべての票に記す 8 段階の合意度。1(全面的支持)から 4(棄権)を経て 8(拒否・ブロック)まで。留保が必要な段階の票は 1 文の留保を伴い、それは裁定へ転記されます。 |
| **Guardrail(ガードレール)** | space メモリレイヤー(`amadeus/spaces/<space>/memory/`)にある Rule ファイル内の本文セクション(`## Forbidden`、`## Mandated`、およびフェーズルールのガードレール見出し)で、規範的な振る舞いの制約を表現します。コンテナが Rule であり、「guardrail」はその中の規範的な内容を指します。**Rule** を参照。 |
| **Harness(ハーネス)** | AI-DLC コアの CLI ディストリビューション — ハーネス中立な **Core** がレンダリングされる、1 つの有能なコマンドラインエージェント。このセットはオープンで成長可能です(今日: Claude Code、Codex CLI、Cursor、Kimi Code、Kiro CLI、Kiro IDE、OpenCode)。*注 — このリポジトリでは「harness」は文脈によって 4 つの意味を持ちます:* (1) **この正典的な CLI ディストリビューションの意味**; (2) rule+sensor の **control loop**(古い用法、現在は改名 — **Control loop** を参照); (3) `packages/framework/harness/<name>/` のソースサーフェスディレクトリ; (4) `tests/harness/` のテストヘルパーディレクトリ。ユーザードキュメントで「a harness」と言えるのは意味 1 だけです。 |
| **herdr** | チームセッションの端末ペイン群を管理するランナー。`scripts/team-up.sh` 経由で起動されます。 |
| **Hook(フック)** | Claude Code がイベントに応じて自動実行する TypeScript スクリプト。この実装はフレームワークのフックを使い、すべて `settings.json` にプロジェクト全体で登録されます: ワークフローの背骨(監査ログ、センサーディスパッチ、runtime-graph コンパイル、statusline 同期、compaction 時の状態検証、サブエージェント追跡、ターン終了時のループ強制)に加えて、セッションライフサイクル(resume コンテキスト、session-end 監査)、プロンプト送信時の human-turn mint、statusline コマンド。各々は自己ゲートし、アクティブなワークフローがなければ no-op します。 |
| **HUMAN_TURN** | 人間の実入力ターンを記録する監査イベント。human-presence ゲートと委任承認はこれを根拠にします。 |
| **Inline execution(インライン実行)** | オーケストレーターがエージェントペルソナをロードし、会話内で直接ステージを実行するデフォルトの実行モード。リアルタイムのユーザー対話をサポートします。 |
| **Inline stage(インラインステージ)** | 委譲せず、オーケストレーターの会話内で直接実行されるステージ。**Inline execution** を参照。 |
| **Intent** | space の `intents.json` レジストリの行(`{uuid, slug, dirName, scope, repos, status}`)として追跡される作業の単位。独自の [Record dir] を `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` に持ちます。`<YYMMDD>` はコンパクトな UTC 日付接頭辞(例: `260624` = 2026-06-24)でレコードが時系列にソートされ、`<label>` はリクエストの短い kebab-case のエッセンスです。同日・同ラベルの衝突は数値カウンタ(`-2`、`-3`、…)で解決します。正典的で衝突しない id は、ディレクトリ接尾辞ではなくレジストリ行に格納された時間順序 UUIDv7 です。エンジンは最初の `/amadeus` で最初の intent を auto-birth します。`active-intent` ポインタが現在のものを選択します。**Space**、**Record dir** を参照。 |
| **Kiro** | Kiro ハーネス — 今日の AI-DLC のハーネスディストリビューションの 1 つで、`packages/framework/core/` から `dist/kiro/`(CLI)と `dist/kiro-ide/`(IDE)に生成され、AIDLC メソッドは Kiro のエージェントリソース glob 経由で `amadeus/spaces/<space>/memory/` から読まれます。`/amadeus` で起動します。[Kiro IDE で AI-DLC を実行する](harnesses/kiro-ide.ja.md) と [Kiro CLI で AI-DLC を実行する](harnesses/kiro-cli.ja.md) を参照。 |
| **Knowledge** | ステージ開始時にエージェントがロードする参照資料。2 階層: 方法論 knowledge(フレームワークに `<harness-dir>/knowledge/` として同梱)とチーム knowledge(ユーザー管理、space レベルのドメイン knowledge、`amadeus/spaces/<space>/knowledge/` — 自由形式、ブートストラップ時は空、space 内のすべての intent で共有)。 |
| **Ladder prompt(旧ラダープロンプト)** | 廃止されたwalking-skeleton後の`autonomous|gated`選択。新しいworkはintent自律レベルを`none|semi|full`から選び、旧recordは診断専用です。 |
| **Lead agent(リードエージェント)** | ステージの作業に主として責任を持つエージェントペルソナ。 |
| **Leader(リーダー)** | ユーザーとメンバーの間を中継し、ゲートを執行し、選挙を配信・集計し、Issue と Pull Request を管理するチームモードの帽子。leader は実装しません。**Builder**、**Conductor**、**Reviewer** を参照。 |
| **Learning loop(学習ループ)** | ステージ内の是正を持続的なプラクティスとセンサーに変えるメカニズム。ステージ中にオーケストレーターは観察を `memory.md` に記録し、承認ゲートでそれらを表面化させ、どれを残すかをあなたが確認します。確認された各学習は space メモリレイヤー(`amadeus/spaces/<space>/memory/project.md`、ワンクリックで `memory/team.md` に昇格)にプラクティスとして書かれる — または新しいセンサーを scaffold する — ため、次のワークフローで適用されます。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Learnings ritual(§13 学習リチュアル)** | ステージ末尾の §13 の手続き。`memory.md` に記録された観察のうちどれを持続的なルールにするかを確定します。**Learning loop** を参照。 |
| **Lifecycle(ライフサイクル)** | AI-DLC 方法論の全体: AI-Driven Development Life Cycle。方法論の 1 回の実行がワークフローです。 |
| **Lifecycle record(ライフサイクルレコード)** | space 配下で「生まれて・状態が変わって・完了する」記録単位の総称(intent と選挙の上位概念、コード識別子は `lifecycleRecord`)。常に完全形で呼びます — 単独の「レコード」は intent の **Record dir** を指すためです。 |
| **Manifest** | ハーネスの `packages/framework/harness/<name>/manifest.ts` — **Packager** に **Core** をそのハーネスの **Distribution** にどう投影するかを伝える宣言的契約(ディレクトリマップ、rules のリネーム、作成されたファイル、任意の `emit` プラグイン)。ハーネスの追加はほぼ 1 つの manifest を書くことです。 |
| **MCP server(MCP サーバー)** | プロジェクトまたはユーザーのハーネス設定で宣言され、セッションにプロビジョニングされる外部ツールサーバー。この実装はデフォルトでプロジェクト MCP サーバーを同梱しません。すべてのエージェントはすべてのセッション MCP サーバーを継承します — per-agent の付与はありません。エージェントがそれを使うのを *防ぐ* には、その `tools:` allowlist を特定の `mcp__<server>__<tool>` id に絞り込みます。認証情報のないサーバーは単に利用不可で、ワークフローを決してブロックしません。[ハーネスプリミティブのマッピング — MCP Servers](../reference/14-claude-features.ja.md#mcp-servers) と [はじめに](01-getting-started.ja.md#mcp-servers-optional) を参照。 |
| **memory.md** | `<record>/<phase>/<stage>/memory.md`(intent のレコードディレクトリ配下)にある per-stage の観察日記。ステージ開始時に自動作成され、オーケストレーターが保守します(手編集しません)。Interpretations、Deviations、Tradeoffs、Open questions を記録します。承認ゲートで学習ループが読む入力です。 |
| **Mirror issue(ミラー Issue)** | intent の共有面となる GitHub Issue。タイトル、概要、レコードディレクトリへのリンク、状態行だけを持ちます。設計詳細と裁定は record 側に置き、同期は record → Issue の一方向です。 |
| **Module(モジュール)** | サービス内のコードレベルの組織境界(パッケージ、名前空間)。 |
| **Multi-repo intent** | 作業が複数の兄弟コードリポジトリにまたがる intent。リポジトリセットは誕生時に捕捉されます — 明示的に `--repos a,b` で、または兄弟の自動発見(`.git` を持つワークスペースルートのすべての直下の子)で — し、intent の `intents.json` 行に `repos` として格納されます。Construction は各 git 操作を `--repo <name>` で特定のリポジトリにアンカーします。記録されたリポジトリのない intent はレガシーな単一リポジトリのケースです(git はプロジェクトディレクトリで実行)。[成果物リファレンス](14-artifacts-reference.ja.md) を参照。 |
| **Norm(ノルム)** | space メモリレイヤーに永続化された Rule。学習ループによって追加され、より広いレイヤーと矛盾するものは admission check で拒否されます(黙って上書きされることはありません)。 |
| **Norm PR(ノルム PR)** | メモリレイヤーの変更を trunk へ反映する専用の Pull Request。無関係なワークフローのコミットが同乗しないよう trunk 単独から切り、独立レビューを受け、人間の承認を得てのみマージします。 |
| **Operating mode(実行形態)** | ワークフローをソロモード(1 エージェントが各役割を順に担う)で回すか、チームモード(leader、conductor、builder、reviewer を別セッションが担う)で回すか。チームモードは `AMADEUS_OPERATING_MODE=team` の明示マーカーがある場合のみ成立し、品質契約はどちらでも同一です。 |
| **Orchestrator(オーケストレーター)** | ワークフローがどう駆動されるかの包括的な用語: 次に何が起こるかを決める決定論的な **Engine** と、それを実行する **Conductor**(`SKILL.md`)。`/amadeus` 経由で起動します。[エンジンとスキルシステム](../reference/17-skill-system.ja.md) を参照。 |
| **origin:bootstrap** | 欠陥コードがこのリポジトリでの作業ではなく上流の bootstrap 初期実装に由来すると判明したバグに付けるラベル。 |
| **Packager(パッケージャ)** | `scripts/package.ts` — **Core** + 各 **Manifest** からローカルの全 `dist/<harness>/` **Distribution** を再生成するbuild。`bun scripts/package.ts` がすべてをbuildし、CIはコミット済み出力との比較ではなく、隔離した2回のbuild比較で再現性を検証します。 |
| **Parallel batch(並列バッチ)** | 依存関係が満たされ、互いに依存しない Bolt のグループで、オーケストレーターによって並行実行されます。バッチの終わりの単一の承認ゲートがその中のすべての Bolt をカバーします。 |
| **Park(パーク)** | ワークフローを再開可能な状態で一時停止すること(再開は `unpark`)。開いたままのゲートはパークをまたいで保存されます。 |
| **Phase(フェーズ)** | ライフサイクルの 5 つの主要区分の 1 つ: Initialization(0)、Ideation(1)、Inception(2)、Construction(3)、Operation(4)。各フェーズは 3〜8 のステージを含みます(Initialization 3、Ideation 7、Inception 8、Construction 7、Operation 7)。 |
| **Phase boundary verification(フェーズ境界検証)** | フェーズ遷移時に実行される自動トレーサビリティチェック。下流のステージがそれらの上に構築する前に、欠落したリンク、孤児化した成果物、不整合を捕捉します。 |
| **Plane(プレーン)** | ネットワークアーキテクチャから借用した、フレームワークが分離する 3 つの関心事の 1 つ: **control plane**(ステージ定義、Rules、Sensors — 何が実行されるべきかのスキーマ、コンパイル時に解決)、**data plane**(実際のステージ実行、Bolt、監査テレメトリ)、**management plane**(`/amadeus --doctor`、監査クエリ、`CLAUDE.md`)。ユーザー向けのオリエンテーションは [ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を、完全なモデルは `docs/reference/02-plane-architecture.md` を参照。 |
| **Planning(計画)** | markdown 成果物を生成するステージ(分析、質問、設計)。**Generation** と対。 |
| **Priority and severity labels(P / S ラベル)** | bug Issue が持つ 2 軸のラベル。`P0`–`P3` が「いつ直すか」、`S1`–`S4` が「どれだけ深刻か」を表します。2 軸は乖離してよく(深刻だが緩和済み、軽微だが即修正など)、起票時に同時に付与します。 |
| **Record dir(レコードディレクトリ)** | 1 つの intent の成果物、per-stage の `memory.md` 日記、`amadeus-state.md`、`audit/` シャードを保持する per-intent ディレクトリ: `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(`<record>/` と表記)。各 intent が独自に持ち、アクティブなものは `active-intent` ポインタで選択されます。**Space**、**Intent** を参照。 |
| **Record-sync PR** | intent の record と codekb の差分を trunk へ反映する Pull Request。どちらのレビューも薄まらないよう、実装 PR とは分けます。 |
| **Recovery breadcrumb** | PreCompact フックが書く隠しファイル `.amadeus-recovery.md`。compaction 後の状態破損検出のため、最後に検証されたステージとタイムスタンプを含みます。 |
| **Reviewer(レビュアー)** | 品質ゲートエージェント — `amadeus-product-lead-agent`(requirements/stories/mockups)または `amadeus-architecture-reviewer-agent`(技術設計) — で、ステージが `reviewer:` フィールドを宣言するとき、ステージ本体が成果物を生成した後に別のサブエージェントとして起動されます。プライマリ成果物に `## Review` の判定(READY / NOT-READY)を追記します。NOT-READY の場合、ビルダーが再実行し、`reviewer_max_iterations`(デフォルト 2)まで繰り返してから、未解決の指摘を人間の承認ゲートで提示します。決してブロックしません — 常に人間が決めます。[エージェント](06-agents.ja.md) を参照。 |
| **Rolling postmortem(ローリング・ポストモーテム)** | 約1時間周期で全メンバーから直近の学習候補を募り、採否を blind 選挙で確定するラウンド。 |
| **Rule(ルール)** | ワークスペースルートの space メモリレイヤー(`amadeus/spaces/<space>/memory/`)に一度作成され、各ハーネスのネイティブなインクルード(Claude の `@`-import スタブ、Kiro のリソース glob、Codex の `AMADEUS_RULES_DIR`)でコンテキストに取り込まれる持続的な振る舞いのルール。それがカバーするすべてのステージに適用されます。ルールは strict-additive な 5 レイヤーチェーン — org → team → project → phase → stage — を通じて解決され、該当するすべてのルールがコンテキストに現れます。より広いレイヤーは決して上書きされず、追加されるだけです。ルールは **control loop** のフィードフォワード側で、決定論的検証のためにセンサーとペアになることがあります。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Runtime graph(ランタイムグラフ)** | intent のレコードディレクトリ内の per-workflow な `runtime-graph.json` 成果物: 構造的ステージグラフの data-plane ミラーで、承認ゲートごとに監査ログから具現化されます。どのステージが実行されたか、どの Bolt がフォークしたか、どのセンサーが発火したか、`memory.md` のエントリ数を記録します — doctor と学習ループが読むクエリ可能な実行ビューです。 |
| **Scope(スコープ)** | どのステージがどの深さで実行されるかを決める名前付き設定。1 スコープ 1 ファイルで `<harness-dir>/scopes/amadeus-<name>.md` に置かれます(enterprise、feature、mvp、poc、fix、chore、refactor、infra、security-patch、workshop)。フレームワークを編集せずにカスタムスコープを追加でき、自由記述の intent から自動検出することもできます。 |
| **Self document** | Amadeus のドキュメント(`README*.md` と `docs/`)を、実測した実装事実に基づいて書く・更新する自己開発。 |
| **Self feature** | 新しい機能・仕様・設計を Amadeus に導入する自己開発。 |
| **Self fix** | 既存の設計・方針・ハーネス間契約との整合を回復する限定的な是正(不具合修正を含む)。新しい機能やアーキテクチャの導入は伴いません。 |
| **Self refactor** | 外部から観測できる振る舞いを変えずに Amadeus の内部構造を改善する自己開発。 |
| **Sensor(センサー)** | `<harness-dir>/sensors/` の manifest で定義される決定論的な検証チェック(例: `amadeus-linter.md`、`amadeus-type-check.md`)。センサーは PostToolUse フック経由でステージの出力への Write/Edit で発火し、advisory な `SENSOR_*` 監査行を記録します — ワークフローを決してブロックしません。ステージは `sensors:` frontmatter リストでどのセンサーが発火するかを宣言します。センサーは **control loop** のフィードバック側で、ルールがフィードフォワード側です。[ルールと学習ループ](09-rules-and-the-learning-loop.ja.md) を参照。 |
| **Service(サービス)** | デプロイ可能なプロセスまたはコンテナ(API サーバー、ワーカー、フロントエンドアプリ)。 |
| **Test strategy(テスト戦略)** | 生成されるテストの数と含まれるテストタイプを制御する 3 つのテストボリュームレベル(Minimal、Standard、Comprehensive)の 1 つ。深さとは独立 — スコープが独自のデフォルトを宣言しない限り深さレベルにデフォルトします(例: workshop は Minimal がデフォルト)。[スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md#the-3-test-strategy-levels) を参照。 |
| **Session(セッション)** | `/amadeus` を実行する 1 つの Claude Code 会話。ワークフローは resume メカニズムを介して複数のセッションにまたがることがあります。 |
| **Skill(スキル)** | Claude Code のプリミティブ: スラッシュコマンドを登録する YAML frontmatter 付きの markdown ファイル。AI-DLC のオーケストレーターは `/amadeus` スキルとして実装されています。ユーザー向けドキュメントでは「skill」より「command」を優先します。 |
| **Space(スペース)** | `amadeus/spaces/<space>/` にある per-team のワークスペースで、独自の `memory/`、`knowledge/`、intent レコード(`intents/`)を保持します。アクティブな space は gitignore された `amadeus/active-space` ポインタで解決され、`default` にデフォルトします。単一チームのユーザーは `spaces/default/` しか見ません。**Intent**、**Knowledge** を参照。 |
| **Stage(ステージ)** | ライフサイクル内の 32 の個別ステップの 1 つ。各ステージにはリードエージェント、定義された入出力があり、ステージプロトコルに従います。ステージはフェーズごとに番号付けされます(例: 1.1、2.4、3.5)。 |
| **State file(状態ファイル)** | `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/amadeus-state.md`(intent のレコードディレクトリ配下)にある持続的な per-intent ワークフロー状態。6 状態のチェックボックス(`[ ]` / `[-]` / `[?]` / `[R]` / `[x]` / `[S]`)を使って、ステージの進捗、スコープ、ワークスペースコンテキスト、セッション resume 情報を追跡します。 |
| **Subagent execution(サブエージェント実行)** | オーケストレーターが Task ツール経由でステージ作業を別の Claude Code サブプロセスに委譲する実行モード。サブエージェントはユーザー対話なしで自律的に実行します。ステージ 2.1(reverse-engineering)と 3.5(code-generation)で使われます。 |
| **Subagent stage(サブエージェントステージ)** | インライン実行ではなく、サブエージェントへ実行を委譲するステージ。**Subagent execution** を参照。 |
| **Swarm** | prepare → 並列 fan-out → check → finalize で、複数の Construction Unit をそれぞれ独自の worktree で並行実装する機構(`amadeus-swarm.ts`)。 |
| **Unit of work(作業単位)** | ステージ 2.7(Units Generation)で分解される、独立して実装可能なソリューションの一片。1 つ以上の Unit が Construction のために Bolt にまとめられます。 |
| **Walking skeleton** | Construction の最初の Bolt — すべての統合点を実行する最も薄いエンドツーエンドのスライス。gateはintent自律レベル表に従い、`full`は確認済みgrant内で裁定でき、`none` / `semi`は人間を待ちます。 |
| **Utility command(ユーティリティコマンド)** | `/amadeus` に渡される非ワークフローのフラグ(`--status`、`--doctor`、`--version`、`--stage`、`--phase`、`--scope` など)。フルワークフローを実行せずに特定の操作を行います。 |
| **Verification theatre(検証劇場)** | 実行結果から導出されない検証 — ハードコードされた status、自己参照比較、両分岐が同一の条件式、どのコードも消費しないフィールド。偽の信頼を生む分だけ、ゲートが無いことより悪いものとして扱います。 |
| **Workflow(ワークフロー)** | `/amadeus` の起動からステージ完了までの、AI-DLC ライフサイクルの 1 回のエンドツーエンド実行。特定のタスク(feature、fix など)にスコープされます。 |
