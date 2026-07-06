# Context

この文書は、Amadeus DLC のドメイン語彙の定義元である。

## AI-DLC Concept Model

**Amadeus DLC**：Amadeus Development Life Cycle の略である。
Amadeus DLC は、AI と人間が協調してソフトウェア開発を進めるための lifecycle 契約である。
Amadeus DLC は Initialization、Ideation、Inception、Construction の 4 phase（0.1〜0.3 と 22 ステージ）、補助分析、成果物、gate、validator、traceability を扱う。
Amadeus DLC は AI-DLC v2 のステージ仕様、Scope 適応、承認 gate、状態管理、監査可能性と意味論互換である。
ただし、Amadeus DLC は AI-DLC v2 の写しではなく、このリポジトリで定義する Profile と成果物契約である。
_Avoid_: cc-sdd の外部前段, 実装生成器, 上流 cc-sdd との混在前提

**Amadeus**：Amadeus DLC を実行、検証、配布するための実装プロジェクトである。
Amadeus は `skills/amadeus*`、`.agents/skills/amadeus*`、validator、template、docs、`amadeus/` 成果物を扱う。
Amadeus は lifecycle 契約そのものではなく、Amadeus DLC を実際の workspace と agent skill で運用するための体系である。
文書で phase、成果物、gate、traceability の契約を指す場合は Amadeus DLC と書く。
文書で skill 群、validator、配布物、workspace 成果物の体系を指す場合は Amadeus と書く。

**AI-DLC v2**：Amadeus DLC が意味論の互換元にする AI 駆動開発 lifecycle である。
AI-DLC v2 は、Intent のライフサイクル、ステージ仕様（ALWAYS / CONDITIONAL）、Scope 適応、人間の承認点、状態管理、監査ログを重視する。
Amadeus DLC はこれらの意味論を、単一入口 `amadeus`、日本語 Markdown の成果物、`amadeus-state.md`、validator、grilling、PR による人間ゲートとして具体化する。

**cc-sdd**：Amadeus DLC が設計成果物から実装計画へ進む順序の参考にした仕様駆動開発の成果物構造である。
cc-sdd は `requirements.md` と `design.md` を入力にして作業計画を生成する流れを持つ。
Amadeus DLC はこの流れを参考にし、Construction の Code Generation で設計成果物を入力に実装計画（`code-generation-plan.md`）を立てる。
ただし、cc-sdd は Amadeus DLC の lifecycle 契約そのものではなく、参照アンカーとして扱う。
_Avoid_: Amadeus DLC の代替, 実装生成器

## Naming Rules

**実行時**：スキルが実際に使われる時点、またはスクリプトが実行される時点を表す。
英語の `runtime` や `Runtime` は、既存コード、固有名、外部仕様名として必要な場合だけ使う。
その語がなくても意味が通じるなら使わない。
文書では原則として「実行時」と書く。
_Avoid_: runtime, Runtime

**実行時依存**：スキルを実行するために必要な依存である。
開発、eval、昇格判断だけに必要な依存とは分ける。
_Avoid_: runtime dependency

**信頼できる参照元**：判断や作業の基準として扱う文書、設定、データである。
「正本」は開発現場の言葉としては硬く、意味が通るなら使わない。
必要な場合は「参照元」「基準」「定義元」「管理元」のように、文脈に合う語へ置き換える。
_Avoid_: 正本

**build workspace**：エージェント、skill、validator、開発用スクリプトを動かす作業場所である。
Amadeus 自己開発では、安定して使う skill、validator、開発用スクリプトを扱う場所として使う。
build workspace は、変更対象の成果物を置く target workspace と分ける。

**host environment**：昇格済み skill または生成された skill が動作する環境である。
`host` は workspace 名ではなく、skill が実際に動作する環境を示す属性として扱う。
既存 skill の供給元を表す場合は、build workspace と stage0 の組み合わせで表す。

**target workspace**：変更差分、自己開発用 `amadeus/`、作業中の成果物を置く作業場所である。
Amadeus 自己開発では、Amadeus 本体リポジトリから切った別 `git worktree` を推奨する。
target workspace は、target artifacts の更新場所であり、host environment と混同しない。

**target artifacts**：skill が生成、更新、検証する成果物集合である。
例として、source skill、昇格先 skill、target workspace の `amadeus/` 成果物を含む。
target artifacts は、skill の実行能力そのものではなく、変更対象または検証対象として扱う。

**model overlay**：build workspace 側でエージェントの使用モデルを固定する project-local な設定である。
`dev-scripts/data/model-overrides.json` に、対象 agent と指定モデル、書き換え前の base 値、宣言済み fallback、fallback 発動記録を持つ。
model overlay は配布物（インストーラ）に含めず、昇格・上流同期・再適用のたびに自動で反映する（Issue #554）。

**reference-stub と直接解決**：record 成果物が Space 共有の `codekb/` を参照する 2 つの形態である。
reference-stub は record 側に codekb を指す薄い参照ファイルを置く形態であり、直接解決は record の成果物が `codekb/` を stub なしで直接参照して満たす形態である（Issue #501 / #548）。
どちらの形態でも validator は pass する。

**Space**：対象 workspace で複数 Intent が共有する入れ物である。
Space は `amadeus/spaces/<space>/` に置き、`memory/`（組織、チーム、プロジェクトの前提）、`knowledge/`（用語、ドメイン知識、Event Storming）、`codekb/`（コードベース知識）、`intents/`（Intent Record と Intent Registry）を持つ。
Space の既定名は `default` であり、対象 workspace の `amadeus/active-space` が現在の Space を指す。
Space の `memory/` と `knowledge/` は、旧構造で steering layer と呼んでいた共有前提の置き場を引き継ぐ。
_Avoid_: steering layer、steering

**多体連携**：leader と engineer1〜3 の各ロールに常設 worktree を固定し、Intent をロール（の worktree）へディスパッチで割り当てる働き方である。
チーム構成を取れる場合だけに選択する運用であり、既定の働き方ではない（`amadeus/spaces/default/memory/team.md`「多体連携の運用」節、Issue #497）。

**ピア協議**：多体連携で、技術的な内容確認を leader と他 engineer 宛てに行うプロトコルである。
期限 15 分、回答 1 件の到着で成立とし、採用判断は質問した engineer が行う（team.md「多体連携の運用」節の質問プロトコル）。

**承認中継**：多体連携で、人間の承認判断を人間 → leader → engineer の順に中継する経路である。
Intent 化の可否を中継するディスパッチ定型文と、gate 承認を中継する中継承認定型文の 2 種を使う（team.md「多体連携の運用」節の承認中継）。

**HUMAN_TURN**：人間同席の証跡として mint するイベントである。
多体連携では、中継承認定型文の受信直後に限り mint し、ピア協議の回答受信では mint しない（team.md「多体連携の運用」節の承認中継）。

**先勝ち + 追従**：並行する Intent が共有成果物へ接触した場合の解消順序である。
先に merge した側を正とし、後続の作業 branch は rebase で追従する（team.md「共有成果物の統合」節）。

**モジュールファイル**：同じ階層にある同じ stem のディレクトリと対になる Markdown ファイルである。
たとえば `amadeus/spaces/<space>/intents/<dirName>.md` は、`amadeus/spaces/<space>/intents/<dirName>/` と対になるモジュールファイルである。
モジュールファイルは、対象成果物そのものの目的、責務、範囲、関連成果物を扱う。

**モジュールディレクトリ**：同じ階層にある同じ stem のモジュールファイルと対になるディレクトリである。
たとえば `amadeus/spaces/<space>/intents/<dirName>/` は、`amadeus/spaces/<space>/intents/<dirName>.md` と対になるモジュールディレクトリである。
モジュールディレクトリは、対象成果物の状態、設計、追跡、補助成果物を扱う。

**モジュール構造**：モジュールファイルとモジュールディレクトリを同じ階層に並べる成果物配置である。
モジュール構造は Rust 2018 の `foo.rs` と `foo/` の配置に近い形で、対象成果物そのものと詳細成果物を分ける。

**ADR**：`docs/adr/` に置いていた Architecture Decision Record の体系である。退役済みであり、新規に作らない（#525）。
まだ有効だった判断は `docs/amadeus/extension-guide.md`（Lifecycle Binding / Profile）と `docs/amadeus/lifecycle/overview.md`（Intent Phase Directory Layout）へ要旨を移設し、詳細な経緯は git 履歴で参照する。
判断記録の現行の置き場は、Intent record の decision、Grilling Decision Trail、steering の根拠表であり、語彙は `CONTEXT.md` が定義元として持つ。

**AI-DLC Core**：DLC を領域に依存せず扱うための抽象モデルである。
AI-DLC Core は phase、state、decision、traceability、gate を扱う。
AI-DLC Core は Unit、Bolt、Functional Design、Event Storming、Aggregate、Bounded Context のような software-development 固有概念を所有しない。

**Lifecycle Binding**：DLC の phase ごとに skill、artifact、gate、validator を接続する概念である。
Lifecycle Binding は成果物ファイル名ではなく、Profile が phase と実行能力と検証条件をどう束ねるかを表す。

**Profile**：特定領域に向けた Lifecycle Binding の具体的な束である。
Profile は、AI-DLC Core の抽象モデルに対して、領域別の成果物契約、phase ごとの skill 接続、gate 条件、validator を具体化する。
software-development profile、ddd profile、writing profile、amadeus profile は Profile の例である。

**Skill**：個別能力の単位である。
Skill は `SKILL.md` を入口にし、必要に応じて `scripts/`、`references/`、`assets/` を持つ。
Skill は DLC の phase 契約そのものではなく、Profile から呼び出される実行能力として扱う。

**Agent Plugin**：skill、agent、hook、MCP server などを同梱できる配布とインストールの単位である。
Agent Plugin は Profile を配布する候補になり得る。
ただし、Agent Plugin は Profile の概念と同一視しない。

**MCP**：外部能力や文脈を接続する層である。
MCP は tools、resources、prompts などを公開する。
MCP は DLC の phase、gate、artifact、validator の契約そのものではない。

**Event Storming**：Domain Event を起点に、ドメイン上の事実、順序、原因、判断待ちを整理する補助分析である。
Event Storming の概要は `amadeus/spaces/<space>/knowledge/event-storming/<event-storming-id>.md`、または `amadeus/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>.md` に置く。
Event Storming の状態と分析成果物は、同じ stem のモジュールディレクトリに置く。
Event Storming は phase を進めず、後続 phase や Domain Model 整理が参照できる分析成果物を作る。
Event Storming は Requirement、Story、Unit、Bolt、Aggregate、Bounded Context、Contract を確定しない。

**Event Storming Level**：Event Storming の分析粒度を表す段階である。
Event Storming Level は `big-picture`、`process-modeling`、`system-design` の3つを使う。
`big-picture` は Domain Event を広く出す。
`process-modeling` は Domain Event の前後にある Command、Actor、Policy、External System、Read Model を整理する。
`system-design` は Aggregate Candidate と Bounded Context Candidate を探索する。

**Domain Event**：ドメイン上で起きた意味のある過去形の事実である。
Domain Event は Event Storming の `events.md` に置く。
Event Storming で扱う Event は Domain Event だけである。
UI event、technical event、integration event、log event は Domain Event として扱わない。

**Aggregate Candidate**：Event Storming の system-design level で見いだした Aggregate の候補である。
Aggregate Candidate は Event Storming の `aggregate-candidates.md` に置く。
Aggregate Candidate は正式な Aggregate ではなく、Construction の Functional Design へ渡す判断材料である。

**Bounded Context Candidate**：Event Storming の system-design level で見いだした Bounded Context の候補である。
Bounded Context Candidate は Event Storming の `bounded-context-candidates.md` に置く。
Bounded Context Candidate は正式な Bounded Context ではなく、後続の Boundary 採用判断へ渡す判断材料である。

**Hotspot**：Event Storming で見つかった未確認事項、矛盾、判断待ち、リスクである。
Hotspot は Event Storming の `hotspots.md` に置く。
Hotspot は Domain Event ではない候補や補足情報の退避先としても扱う。

**Intent**：達成したい目的を表す出発点である。
Intent は、独立して完了判断でき、観測可能な成功基準を持つアウトカムを 1 つ扱う。
Intent はライフサイクル 1 周分の作業単位であり、Unit 相当の実現手段を Intent として登録しない。
Intent の概要と scope は正準台帳 `amadeus/spaces/<space>/intents/intents.json` に置く。依存関係と目標プロファイルの詳細な置き場は、record 内の該当成果物（`intent-statement.md`、`requirements.md`、decision）に個別に記録する。
Intent の目的、対象、成功条件、契機、範囲は、scope が Intent Capture & Framing を実行対象にする場合は `intent-statement.md`、実行しない場合は `requirements.md` に置く。
Intent の状態と phase ごとの成果物は `amadeus/spaces/<space>/intents/<dirName>/` に置く。
ビジネス目標、機能目標、技術的成果を含む。
Intent は、単一の境界づけられたコンテキストに閉じるとは限らない。
複数の境界づけられたコンテキストをまたぐ Intent は、Unit に分解して開発と検証へ進める。

**Intent Record**：Intent が Amadeus DLC 上で存在していることを示す最小構造である。
Intent Record は、`amadeus/spaces/<space>/intents/<dirName>/` の record ディレクトリ、`amadeus/spaces/<space>/intents/intents.json` の行、`amadeus-state.md` で構成する。
概要、依存、目標プロファイルは record 配下の該当成果物（`intent-statement.md`、`requirements.md`、decision）に置く。
目的、対象、成功条件、契機、範囲は、scope が Intent Capture & Framing を実行対象にする場合は `intent-statement.md`、実行しない場合は `requirements.md` に置く。
Intent Record の骨格と `amadeus-state.md` は、Birth 提案の承認を受けて Initialization が作る。
内容の具体化は、scope が Intent Capture & Framing を実行対象にする場合に Stage 1.1 が行う。

**Amadeus State**：Intent Record の実行状態を唯一保持する成果物である。
Amadeus State は record 直下の `amadeus-state.md` に置き、AI-DLC v2 の state template のセクション構成をそのまま使う。
ステージ状態は Stage Progress の checkbox（Pending、Active、AwaitingApproval、Revising、Completed、Skipped の 6 種）で表す。
Initialization が完了した直後の Lifecycle Phase は、scope が Ideation の全ステージを SKIP にする場合は `INCEPTION`、それ以外は `IDEATION` である。

**Audit Trail**：Intent Record の承認と遷移の履歴を追記専用で記録する成果物である。
Audit Trail は record 直下の `audit/audit.md` に置き、AI-DLC v2 の audit format に従うイベントだけを追記する。
Audit Trail は `STAGE_AWAITING_APPROVAL`、`GATE_APPROVED`、`GATE_REJECTED`、`STAGE_COMPLETED`、`STAGE_SKIPPED`、`PHASE_VERIFIED`、`BOLT_STARTED`、`BOLT_COMPLETED` などのイベントを扱う。
承認と差し戻しの根拠は、Amadeus State ではなく Audit Trail が持つ。
_Avoid_: review, validation, 完了確認

**Initialization**：Birth 提案の承認直後に Intent Record の骨格と Amadeus State を作る、決定論的な初期化 phase である。
Initialization は Stage 0.1 workspace-scaffold、0.2 workspace-detection、0.3 state-init の 3 ステージで構成する。
Initialization は Ideation、Inception、Construction と並ぶ Phase Progress の 1 つであり、人間の判断を必要としない。

**目標プロファイル**：Intent の達成対象と進め方を初期整理する情報である。
目標プロファイルの scope は正準台帳 `intents.json` に置き、goalType と labels は record 内の該当成果物（`intent-statement.md` または `requirements.md`）に置く。
目標プロファイルは `goalType`、`scope`、`labels` を扱う。

**goalType**：Intent が扱う目標の性質を示す分類である。
`business`、`technical`、`mixed`、`未確認` のいずれかを使う。
`business` は主に業務価値や利用者価値を達成する Intent を示す。
`technical` は主に品質、構造、検証、配布、運用可能性などの技術的成果を達成する Intent を示す。
`mixed` は業務価値と技術的成果を同じ Intent の目標として扱う場合に使う。

**scope**：Intent の進行プロファイルである。
scope は AI-DLC v2 の Scope に対応し、どのステージを実行対象にするかを決める単一の制御値である。
`enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`workshop`、`未確認` のいずれかを使う。
scope とステージの対応は `docs/amadeus/lifecycle/scopes.md` に従う。

**labels**：Intent の検索、集計、補足分類に使う任意ラベルである。
labels は複数指定できる。
labels は phase や stage の制御には使わない。

**Intent Capture & Framing**：Ideation の Stage 1.1 として、Birth 済み Intent の目的、対象、成功条件、契機を clarifying questions で確定する責務である。
Intent Capture & Framing は Requirement、Story、Unit、Bolt を定義しない。
Intent Capture & Framing は、単一入口 `amadeus` のルーティングから内部 skill として実行される。

**Intent Phase Directory Layout（Intent phase ディレクトリ配置）**：Intent の record ディレクトリ（`amadeus/spaces/<space>/intents/<dirName>/`）配下で、phase ごとの成果物を `ideation/`、`inception/`、`construction/` に分ける成果物配置である。
各 phase ディレクトリの配下は、ステージ slug ごとのディレクトリ（例: `ideation/scope-definition/`、`inception/requirements-analysis/`）に成果物を置く。
Intent Phase Directory Layout では、Intent の概要は `intents.json` の該当行と record 内の成果物が持ち、`amadeus-state.md` は `amadeus/spaces/<space>/intents/<dirName>/amadeus-state.md` に置く。
`operation/` は record の scaffold だけを持つ phase ディレクトリであり、Operation の 7 ステージは Amadeus の実行対象外として常に Skip 扱いにする。
旧 Intent 直下配置との後方互換は、`docs/backward-compatibility.md` に記録された対象がない限り維持しない。

**Stage Memory**：ステージ実行中の解釈、逸脱、トレードオフ、未解決の問いを記録する、ステージごとの補助成果物である。
Stage Memory は対象ステージディレクトリの `memory.md` に置く。
Unit 単位ステージでは `construction/<unit-id>-<slug>/<stage-slug>/memory.md` に置く。
Stage Memory はゲート提示の直前に更新し、Amadeus State や Audit Trail の代わりにはならない。

**Intents**：Amadeus DLC 全体で扱う Intent 群である。
Intents の正準台帳は Intent Registry（`intents.json`）である。人間向け一覧は常設ファイルとして持たず、必要な場合に台帳から都度生成する（GD009）。
Intent が別の Intent の成果を前提にする場合は、依存関係を記録する。

**Intent Registry**：Intent の正準 ID と一覧を追記していく台帳である。
Intent Registry は `amadeus/spaces/<space>/intents/intents.json` に置き、各行に `{uuid, slug, dirName, scope, repos, status}` を持つ。
`uuid` は UUIDv7 であり、衝突しない正準 ID である。
人間向けの Intent 一覧が必要な場合は、常設ファイルを持たず Intent Registry から都度生成する（`intents.md` 索引は GD009 で廃止した）。

**docs-only 宣言**：成果物が record 内文書だけの Intent を、`workspace_requires` ガードから免除する仕組みである。
Intent Registry（`intents.json`）の `docsOnly` フィールドに持ち、`amadeus-state.ts declare-docs-only --evidence <ref>` だけが書き込める（tool-owned、Issue #499）。
免除の発動は audit の `GUARD_EXEMPTED` として記録する。

**登録層**：Intent が Amadeus DLC 上で存在していることを管理する範囲である。
登録層は Intent Record と同じ構造を指す。
登録層は `amadeus` の Intake（Birth）と Ideation の Intent Capture & Framing が扱う。
登録層は、Intent の record ディレクトリ、`intents.json`、`amadeus-state.md`、`intent-statement.md`、目標プロファイル、目的、成功条件、範囲、依存関係を扱う。
登録層は、各ステージの成果物と実装方針を扱わない。

**Intake**：単一のライフサイクル入口が入力を受けたときに最初に行う判定である。
Intake は、継続判定、既存 Intent への合流判定、Intent 受理条件の確認、scope 推定、Birth 提案の順で進める。
継続か新規かの判定に迷う場合は継続とみなす。
Intake は Intent の規模を数値で判定せず、1 回の入力から生まれる Intent を最大 1 個にする。

**Birth 提案**：新しい Intent の作成を、推定した scope を明示して人間に確認する提案である。
人間の明示的な承認なしに Intent を作らない。

**Intent 受理条件**：入力を Intent として受理するための定性条件である。
①観測可能な成功基準を持つ、②独立して完了判断できる、③既存 Intent のアウトカムに属さない、の 3 つで判定する。
技術的な Intent では、①を保存すべき振る舞いと観測可能な改善指標で判定する。
受理条件を満たさない入力は拒否せず、質問でガイドするか、スコープバックログまたは既存 Intent への合流へ導く。
Unit 数や Bolt 数のような数値目安は受理条件にしない。

**スコープバックログ**：Intent の対象外にした作業と将来の作業候補を、優先度付きの proto-Unit として保持する成果物である。
スコープバックログは Scope Definition が `ideation/scope-definition/intent-backlog.md` として作る。
スコープバックログの項目は将来 Intent の予約席ではなく、Units Generation の Unit 候補、または Intake の合流判定の照合先として使う。
_Avoid_: 追加作業, ついで対応

**Scope 適応**：scope に応じて、実行するステージ集合と depth を縮退させる仕組みである。
小ささ自体は許容し、小さい作業にすべてのステージが走ることを防ぐ。

**Depth**：ステージ内の作業の深さを表す 3 段階の設定である。
`Minimal`、`Standard`、`Comprehensive` のいずれかを使う。
Depth は質問量とテスト戦略の目安を決め、既定値は scope が決める。

**Walking Skeleton**：Construction の最初の Bolt として実行する、アーキテクチャを貫通する最小スライスである。
Walking Skeleton の Bolt は、自律実行の設定に関わらず必ず人間が承認する。

**Requirement**：Intent を検証可能な要求へ落とした中間契約である。
Requirement は、識別子と受け入れ条件を持つ行として `inception/requirements-analysis/requirements.md` に置く。
Story がない作業でも、Unit、Bolt は Requirement を参照して進める。
旧契約の `inception/acceptance.md` は退役済みであり、受け入れ条件は Requirement 自身が持つ。

**Unit**：Intent から導かれる、独立して開発と検証を進められる価値単位である。
Unit は Units Generation が `inception/units-generation/units.md` に置き、依存 DAG を `unit-dependencies.md` に置く。
Unit は Requirement を参照し、Requirement は Unit を所有しない。
Unit の実装順序は Units Generation では決めず、Delivery Planning が経済的な順序付けとして決める。
_Avoid_: task, requirement, 実装ステップ

**Bolt**：Unit を実装、検証する短い反復単位であり、Construction の実行単位である。
Bolt の計画は Delivery Planning が `inception/delivery-planning/bolt-plan.md` に置く。
Bolt は 1 つの Unit、または依存関係で結び付いた少数の Units を束ねる。
Bolt の実行状態は `amadeus-state.md` の Project Information にある `Bolt Refs` に置く。
Bolt の開始と完了は `audit/audit.md` の `BOLT_STARTED`、`BOLT_COMPLETED`（Bolt PR の URL を含む）に記録し、`BOLT_COMPLETED` を gate evidence にする。
Delivery Planning を実行しない scope では、Intent 全体を単一の暗黙 Bolt（識別子 `implicit`）として扱う。
_Avoid_: task, requirement, 実装ステップ

**Ready 化**：draft PR 運用における「人間はいつ merge してもよい」という意思表示である。
2026-07-06 に恒常ルールとして確定した（本 Intent の requirements FR-3.1、business-logic-model B003-3）。

**Functional Design**：Construction の Stage 3.1 として、対象 Unit の業務ロジック、業務ルール、Domain Entity、必要な UI 構成を整理する条件付き成果物群である。
Functional Design は Unit ごとに必要性を判定し、必要な Unit だけを `construction/<unit-id>/functional-design/` に記録する。
Functional Design は詳細な Domain Model と Intent Contracts の管理元である。
Unit 単位の状態は `amadeus-state.md` の CONSTRUCTION PHASE にある `Per unit: <unit>` ブロックの `functional-design` checkbox に記録する。

**Story**：Requirement をユーザー価値の単位で表す条件付きの表現形式である。
Story は User Stories ステージが `inception/user-stories/stories.md` に置き、ペルソナを `personas.md`、充足評価を `assessment.md` に置く。
利用者向け機能、複数ペルソナ、複雑な業務ロジック、チーム横断の作業がある場合に作る。
リファクタ、バグ修正、インフラ変更、内部品質改善では省略できる。

**Decision**：Intent 内の構造、境界、進め方に影響する判断である。
Decision の詳細は対象 phase ディレクトリの `decisions/<decision-id>-<slug>.md` に置く。
Decision が別の Decision の採用や前提を必要とする場合は、依存関係を記録する。

**Decisions**：Intent 配下の Decision 群である。
Decisions の一覧は対象 phase ディレクトリの `decisions.md` に置く。
一覧と依存関係は `decisions.md` に置き、個別判断は同じ phase ディレクトリの `decisions/<decision-id>-<slug>.md` に置く。

**Grilling Decision Trail**：`guided` または `refine` で確認した、成果物の意味や後続判断に影響する質問、回答、確定判断、反映先の記録である。
Grilling Decision Trail は生ログではなく、確定した判断過程だけを扱う。
Grilling Decision Trail の索引は反映先と同じ phase ディレクトリの `grillings.md` に置き、session 詳細は同じ phase ディレクトリの `grillings/Gxxx-<topic>.md` に置く。

## 関係

所有関係は次の形にする。

```text
Space
  ├─ Event Storming optional
  └─ Intents

Intent
  ├─ Event Storming optional
  ├─ Ideation
  │   └─ スコープバックログ
  ├─ Inception
  │   ├─ Requirements
  │   ├─ Stories optional
  │   ├─ Application Design optional
  │   ├─ Units
  │   └─ Bolt 計画
  └─ Construction
      ├─ Functional Design optional
      └─ Bolts
```

参照関係は次の形にする。

```text
Unit -> Requirement
Bolt -> Unit
Functional Design -> Unit
Functional Design -> Requirement
Code Generation -> Functional Design
Code Generation -> Unit
Story -> Requirement
```

Unit を Story から切り出す場合、Unit は Story を入力参照してよい。
ただし Story は Unit を所有せず、Unit も Story を所有しない。

Requirement から Unit、Bolt を見る場合は、所有ではなく逆引きの projection として扱う。

境界づけられたコンテキストから Intent を見る場合も、所有ではなく逆引きの projection として扱う。
Intent と境界づけられたコンテキストの対応は、Unit の主担当と協調先を通じて表す。

**Traceability**：Intent 配下で、成功条件、Requirement、Story、Unit、Bolt、成果物の対応を扱う横断成果物である。
Traceability は phase ごとに分離し、対象 phase ディレクトリの `traceability.md` に置く。
Ideation では Approval & Handoff が、Construction では phase 境界処理が確定する。
Requirement や Unit を所有せず、参照関係と検証状態を記録する。
_Avoid_: 作業ログ

**Glossary**：Amadeus DLC 全体で使う確定済みの用語集である。
`amadeus/spaces/<space>/knowledge/glossary.md` に置く。
Intent 配下には置かない。
`CONTEXT.md` を語彙の唯一の定義元（正準）とし、Glossary は workspace 運用で頻用する語の抜粋 + 参照である。
同期は `CONTEXT.md` から Glossary への一方向・手動とし、Glossary は独自定義を持たない。

**Domain Map**：Amadeus DLC 全体で現在採用されている Subdomain と Bounded Context を読むための索引である。
Domain Map は Space の初期入力ではなく、Construction の承認済み成果物（Functional Design の反映候補の採用判断）から更新される。
Domain Map は候補を扱わず、状態は `adopted` と `retired` だけを扱う。

**Context Map**：Amadeus DLC 全体で現在採用されている Bounded Context 間の依存を読むための索引である。
Context Map は Upstream Context、Downstream Context、Organization Pattern、Integration Pattern と根拠を扱う。
Context Map は Space の初期入力ではなく、Construction の承認済み成果物から更新される。

**Domain Model**：特定 Unit の概念間の関係、不変条件、ライフサイクル、集約候補を扱うモデルである。
詳細な Domain Model は Construction の Functional Design に置く。
Amadeus DLC 全体の現在像は Domain Map と Context Map で読む。

**Aggregate**：整合性を保って扱うドメインオブジェクトのまとまりである。
Aggregate は Event Storming の Aggregate Candidate から自動確定せず、Construction の Functional Design の判断で採用する。

**Bounded Context**：特定のモデル、語彙、責務が一貫して通用するドメイン境界である。
Bounded Context は Event Storming の Bounded Context Candidate から自動確定せず、Construction の承認済み成果物を根拠に Domain Map で採用する。

**DDD Module**：境界づけられたコンテキスト内で、概念関係、ライフサイクル、集約候補をまとめるモデル単位である。
Amadeus DLC では、DDD Module ごとの詳細モデルを Construction の Functional Design に置く。

**Upstream Context**：別の境界づけられたコンテキストが参照、利用、または順応する側の境界づけられたコンテキストである。
コンテキスト間依存では `Upstream` として記録する。

**Downstream Context**：Upstream Context が提供するモデル、契約、公開インターフェイスに依存する側の境界づけられたコンテキストである。
コンテキスト間依存では `Downstream` として記録する。

**Organization Pattern**：境界づけられたコンテキストを担うチーム同士の関係を示す分類である。
Amadeus DLC では、パートナーシップ、別々の道、順応者、顧客／供給者を使う。

**Integration Pattern**：境界づけられたコンテキスト同士のモデルやインターフェイスの連携方法を示す分類である。
Amadeus DLC では、共有カーネル、巨大な泥団子、公開ホストサービス（OHS）、公表された言語（PL）、腐敗防止層（ACL）を使う。

**Intent Domain Model**：特定の Intent で使う概念、関係、ライフサイクル、集約候補を扱うモデルである。
Inception では作らず、未確定事項は `domain-notes.md` に置く。
実装設計として確定する内容は Construction の Functional Design に置く。

**Intent Bounded Context**：特定の Intent で Unit を切る時に参照する境界づけられたコンテキスト、責務、外部境界である。
Unit は Domain Map の adopted Bounded Context、または未採用の境界候補を参照する。
未採用の境界候補を参照する場合は、`domain-notes.md` に未確認事項を残す。

**Intent Contracts**：特定の Intent で守る事前条件、不変条件、事後条件と根拠を扱う文書である。
Inception では作らず、実装設計として確定する内容は Construction の Functional Design に置く。
事前条件は `PREnnn`、不変条件は `INVnnn`、事後条件は `POSTnnn` の識別子で扱う。
_Avoid_: brief, spec, 実装契約

**Terminology Notes**：Intent 内で見つかった未確定語、提案語、用語確認事項を一時的に扱う文書である。
Intent 配下に置く場合は `terminology-notes.md` とする。

**Domain Notes**：Intent 固有のモデル上の発見や未確定事項を扱う文書である。
正式化された内容は、対象範囲に応じて Domain Map、Context Map、または Construction の Functional Design に昇格する。
