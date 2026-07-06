# Amadeus Lifecycle Contract Overview（Amadeus ライフサイクル契約概要）

## 位置づけ

この文書群は、[Issue #369](https://github.com/amadeus-dlc/amadeus/issues/369) で確定した v2 互換ライフサイクルの目標契約である。

AI-DLC v2（[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) の `v2` ブランチ）の Ideation、Inception、Construction の仕様を、意味論互換で Amadeus に実装するための契約を定義する。

旧モデルの段階別契約（docs/amadeus/stages/）は、#369 の退役 wave で本契約に置き換えて削除した。Space の契約は [steering.md](../steering.ja.md) を参照する。

## 互換方針

互換の対象は仕様と意味論である。

次を v2 と一致させる。

- ステージの責務、実行条件（ALWAYS / CONDITIONAL）、入出力成果物の意味。
- Intake の判定（合流既定、人間承認付き birth 提案）。
- Scope 適応（scope によるステージ集合の縮退と depth）。
- ゲートの状態機械（ステージ承認、Bolt ゲート、revision loop）。
- 質問プロトコルの成果物（questions ファイルと回答記録）。

次は Amadeus 流の表現を維持する。

- 成果物は日本語 Markdown で書く。
- Intent の記録は record ディレクトリ（`intents/<YYMMDD>-<label>/`）で配置し、正準台帳は `intents.json` が持つ。
- 状態は record 直下の `amadeus-state.md`（Stage Progress checkbox）と `audit/` 配下の audit shard（clone ごとの `audit/<host>-<clone>.md`。イベント）で管理する。
- 構造検証は `amadeus-validator` が担う。
- 質問の提示は `amadeus-grilling` のプロトコル（一問ずつ、推奨回答付き）で行う。
- phase 境界と Bolt 完了の人間ゲートは PR と人間 merge で行う。

## Intent の定義と受理条件

**Intent**：独立して完了判断でき、観測可能な成功基準を持つアウトカムであり、ライフサイクル 1 周分の作業単位である。

Intent の受理条件は次の 3 つの定性条件である。

1. 観測可能な成功基準を持つ。技術 Intent の場合は、保存すべき振る舞い（preserve 条件）と観測可能な改善指標を持つ。
2. 独立して完了判断できる。
3. 既存 Intent のアウトカムに属さない。

Unit 数や Bolt 数のような数値目安は受理条件にしない。
Ideation 時点の Unit 数と Bolt 数は実測できない予測値であり、検証可能な条件にならないためである。

受理条件を満たさない入力は拒否しない。
質問でガイドし、成功基準を言語化できれば受理し、既存 Intent の成功条件の一部であれば合流へ導く。
これは v2 の Principle 2（Every Intent Starts Ambiguous）に対応する。

## Intake

**Intake**：単一入口が入力を受けたときに最初に行う判定である。

Intake は次の順で判定する。

1. 継続判定。入力がアクティブな Intent または既存 Intent の続きであれば、その Intent の次ステージへ進む。判定に迷う場合は継続とみなす（v2 の Default to CONTINUATION）。
2. 合流判定。入力が既存 Intent のアウトカムに属する新しい作業であれば、その Intent のスコープバックログへの追加を提案する。
3. 受理条件の確認。新しいアウトカムに見える入力は、受理条件 3 つを確認する。満たさない場合は質問でガイドする。
4. scope 推定。入力のキーワードから scope を推定する。推定できない場合、またはテーマ記述とみなせる長さの入力は `feature` を既定にする。
5. birth 提案。新しい Intent の作成は、推定した scope を明示した提案として人間に確認する。人間の明示的な承認なしに Intent を作らない（v2 の never auto-birth）。

Intake は Intent の規模を数値で判定しない。
1 回の入力から生まれる Intent は最大 1 個であり、テーマ内の残りの作業はスコープバックログが受け皿になる。

## 単一入口とルーティング

ライフサイクルの公開入口は単一 skill である。

公開入口は Intake を行い、対象 record の `amadeus-state.md` を読み、scope とステージ進行状態から次に実行するステージを解決し、対応する内部 skill を呼び出す。

ユーザーは phase やステージを選ばない。
phase とステージの解決は入口の責務である。

中断した Intent は、次の入口呼び出しで `amadeus-state.md` の Session Resume Point から再開する。

補助入口は独立したまま維持する。
`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator` は本契約の対象外である。

## Phase 構成

ライフサイクルは Initialization、Ideation、Inception、Construction、Operation の 5 phase から成る。

**Initialization**：Stage 0.1 Workspace Scaffold、0.2 Workspace Detection、0.3 State Initialization の 3 ステージを持つ。全 scope が実行対象にし、承認ゲートを持たない。人間が Birth 提案を承認した直後に、単一入口が直接実行して record を作る。

**Ideation**、**Inception**、**Construction** は、それぞれ [ideation.md](ideation.ja.md)、[inception.md](inception.ja.md)、[construction.md](construction.ja.md) が定義するステージを持つ。

**Operation**：v2 の 7 ステージに対応する record の scaffold だけを持つ。Amadeus はいずれのステージも実行対象にせず、Stage Progress は常に `[S]`（`SKIP: out of Amadeus scope`）にする。対象外にする理由（成果物契約、gate、validator、PR 境界）と本家 Operation skill の扱いは [AI-DLC v2 Operation Phase Boundary](../aidlc-v2-operation-phase-boundary.ja.md) に従う。

## スコープバックログ

**スコープバックログ**：Intent の対象外にした作業と将来の作業候補を、優先度付きの proto-Unit として保持する成果物である。

スコープバックログは Stage 1.4 Scope Definition が `intent-backlog.md` として作る。

「今回やらないもの」の受け皿はスコープバックログであり、将来 Intent の予約席を作らない。
バックログ項目は、後続の Units Generation で Unit 候補として評価されるか、Intake の合流判定の照合先になる。

## ゲート契約

ゲートは 3 層で構成する。

**ステージゲート**：各ステージの完了時に、会話内で人間の承認を得るゲートである。
承認の選択肢は Approve と Request Changes を基本にする。
Ideation と Inception のステージだけ、スキップ済みステージの追加を第 3 の選択肢にできる。
同じステージで Request Changes が 3 回続いた場合は、Accept as-is を選択肢に追加する。
ゲートを提示したターンでは回答を待ち、承認なしに次へ進まない。
承認は `GATE_APPROVED` イベントとして `audit/` の shard に記録する。

**Bolt ゲート**：Construction の Bolt 実行に適用するゲートである。
最初の Bolt（walking skeleton）は、設計成果物と生成コードをまとめて必ず人間が承認する。
walking skeleton の承認直後に、残りの Bolt を自律実行するかゲートを続けるかを一度だけ確認する（ladder 提案）。
自律実行中も、失敗時は停止して人間に確認する（halt-and-ask）。

**phase ゲート**：phase 境界（Ideation 完了、Inception 完了）と Bolt 完了は PR と人間 merge で確定する。
ステージごとに PR を作らない。
PR の単位を phase と Bolt に限定することで、ステージ承認の往復を会話内に収め、PR 往復のコストを抑える。

## 質問プロトコル

各ステージは、確認が必要な論点を questions ファイル（`<stage-slug>-questions.md`）として stage ディレクトリに残す。

質問の提示は `amadeus-grilling` のプロトコルに従う。
一問ずつ提示し、各質問に推奨回答を添え、回答を待つ。
回答は questions ファイルに記録する。
成果物の意味や後続判断に影響する確定判断は、Grilling Decision Trail にも記録する。

質問の量は depth を目安にする。

| Depth | 1 ステージあたりの目安 |
|---|---|
| Minimal | 2〜4 問 |
| Standard | 5〜8 問 |
| Comprehensive | 8〜12 問以上 |

目安は上限ではない。
曖昧さと矛盾の解消は depth に関わらず必須である。
phase が進むほど質問は減り、Construction では質問を例外扱いにする。

## 成果物配置

Amadeus の成果物は `amadeus/` 配下に置く。
Space の成果物は `amadeus/spaces/<space>/` に置き、Intent の成果物はその配下の `intents/` に置く。

```text
amadeus/
  active-space                        # カーソル（gitignore、現在の Space 名を指す。なければ default）
  spaces/
    default/
      memory/
        org.md                       # 組織既定
        team.md                      # チームの働き方（org.md を上書き）
        project.md                   # プロジェクト固有の判断材料（team.md を上書き）
        phases/                      # phase 別の補足（任意）
        templates/                   # プロジェクト固有のテンプレート上書き（任意）
      knowledge/
        glossary.md
        actors.md
        external-systems.md
        background.md
        domain-map.md                # 採用済みまたは廃止済みの Subdomain と Bounded Context の索引
        context-map.md               # 採用済みまたは廃止済みのコンテキスト間依存の索引
        event-storming/              # Intent 作成前の Event Storming
      codekb/
        <repo>/                      # コードベース知識（v2 の codekb。brownfield で作る）
      intents/
        active-intent                # カーソル（gitignore、Intake の継続判定が読む）
        intents.json                 # レジストリ（正準台帳。uuid、slug、dirName、scope、repos、status）
        <YYMMDD>-<label>/            # record
          amadeus-state.md             # Stage Progress、Phase Progress ほか（状態の唯一の持ち主）
          verification/
          audit/
            <host>-<clone>.md        # 追記専用のゲート・遷移イベント（clone ごとの shard）
          initialization/
            <stage-slug>/
          ideation/
            <stage-slug>/            # ステージごとの成果物、<stage-slug>-questions.md、memory.md
            decisions.md             # phase の判断（decision-log 相当）
            traceability.md          # Amadeus 拡張
            grillings.md             # Grilling Decision Trail 索引
            grillings/
          inception/
            <stage-slug>/
            decisions.md
            traceability.md
            grillings.md
            grillings/
          construction/
            <unit-id>-<slug>/
              <stage-slug>/          # Unit 単位ステージ（3.1〜3.5）の成果物
            bolts/
              <bolt-id>-<slug>/      # Bolt 実行記録（build-and-test、pr.md）
            ci-pipeline/             # Intent 単位（3.7）
            decisions.md
            traceability.md
            grillings.md
            grillings/
          operation/
            <stage-slug>/           # v2 の 7 ステージ分の scaffold。Amadeus は実行対象にしない
```

Intent のモジュールファイル（`<dirName>.md`）と `intents.md` 索引は GD009 で廃止した。
v2 の intent-statement に対応する内容（目的、対象、成功条件、契機、範囲）は、Stage 1.1 が作る `ideation/intent-capture/intent-statement.md` が持つ。
人間向けの Intent 一覧が必要な場合は、正準台帳 `intents.json` から都度生成する。

コードベース知識（v2 の codekb）は Intent をまたいで再利用するため、Space の `codekb/<repo>/` に置く。

この phase ディレクトリ構成（record 直下の `ideation/`、`inception/`、`construction/`、`operation/` への分離）は 2026-06-29 に採用した判断である（旧 ADR 0002、退役 #525）。Intent のモジュールディレクトリ直下にすべての成果物を並べる配置ではなく、phase ごとの成果物を分けることで、phase 単位の責務、gate、traceability、validator の境界を保つ。この ADR が当初参照していた record ルートと状態ファイル名は、その後 #387 の AI-DLC v2 完全準拠で置き換わった（上記の `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` と `amadeus-state.md` に反映済み）が、phase ディレクトリ構成そのものの判断は引き続き有効である。詳しい経緯は `git log -- docs/adr/0002-intent-phase-directory-layout.md` を参照する。

## ステージ契約の I/O 記法

phase 別文書（[ideation.md](ideation.ja.md)、[inception.md](inception.ja.md)、[construction.md](construction.ja.md)）の各ステージは、`### Inputs` と `### Outputs` を対で持つ。
本節は Inputs 表の記法の正である。

### Inputs 表の形式

Inputs 表は次の 3 列で書く。

| 列 | 意味 | 英語化後のラベル |
|---|---|---|
| Artifact | ステージが読む入力の名称（成果物の record 相対 path、workspace / Space の既存参照、Intake 由来の入力）。実在を確認できた入力だけを書く。 | Artifact |
| 必須 | `必須` / `任意` / `条件付き（条件名）` / `必須（<ステージ名> 実行時）` のいずれか。 | Required（値は Required / Optional / Conditional (condition) / Required (when <stage> runs)） |
| 供給元 | 産出ステージ番号（`Stage N.M`）、`Intake`、`workspace`、`Space` のいずれか。 | Source |

供給元の意味は次のとおりである。

| 値 | 意味 |
|---|---|
| Stage N.M | 当該ステージの Outputs が供給する。 |
| Intake | Intake の birth 提案と承認内容が供給する。 |
| workspace | workspace の既存状態（codekb、既存リポジトリ）が供給する。 |
| Space | Space の共有資産（`memory/team.md` など）が供給する。 |

複数の供給元は読点で列挙し、代替の供給元は `または` で書く（例: `Stage 2.4、2.5`、`Stage 1.1 または Intake`）。

### エンジン実態との対応

Inputs 表の一次実測源は、エンジンの stage 定義（`.agents/amadeus/amadeus-common/stages/<phase>/<slug>.md`）の frontmatter `consumes`（`artifact` / `required` / `conditional_on`）である。
`conditional_on` は `条件付き（条件名）` に対応する（例: `条件付き（brownfield）`）。
upstream-coverage sensor は `consumes` の純粋な派生であり、独立した実測源にしない。
文書とエンジンの記述が乖離した場合は、エンジン実態を正として文書を補正する。

### 供給元ステージが CONDITIONAL の場合

frontmatter の `required: true` は「供給元ステージが実行された場合に必須」を意味し、供給元ステージ自体の実行条件（`execution: CONDITIONAL`、scope による SKIP）を含まない。
供給元ステージが CONDITIONAL、または scope により SKIP され得る場合、必須値は `必須（<ステージ名> 実行時）` と書く（例: `必須（Application Design 実行時）`）。
scope 縮退時の入力代替は [scopes.md](scopes.ja.md) の「縮退時の入力代替」を参照する。

### phase 共通入力

全ステージが共通に読む steering/memory 参照（`org.md`、`team.md`、`project.md`、`phases/<phase>.md` = エンジンの rules_in_context）は、各ステージの Inputs 表に繰り返さず、各 phase 文書の Phase Overview に 1 回だけ書く。

### 実在しない入力の禁止

Inputs に書けるのは、上記の実測源で実在を確認できた成果物と参照だけである。
推測で入力を書かない。

## v2 との構造差分

v2 の state machine、ディレクトリ構造、Initialization、audit trail、Intent registry は構造一致で採用する。
意味論互換の範囲で、次の Amadeus 独自成果物だけを意図的な差分として持つ。

| 項目 | v2 | Amadeus | 理由 |
|---|---|---|---|
| 質問の確定記録 | 質問ファイルへの一括記入または対話 | grilling プロトコルと Grilling Decision Trail（`grillings.md`、`grillings/`） | 一問ずつ、推奨回答付きの既存契約と、確定判断の追跡成果物を維持する。 |
| 監査証跡の補完 | 監査証跡のイベントだけ | `audit/` の shard に加えて `traceability.md`（成果物の追跡）と `decisions.md`（phase の判断） | イベント列とは別に、成果物単位の追跡と判断の要約を維持する。 |
| 成果物の言語 | 英語 Markdown | 日本語 Markdown | 日本語規範（一文ごとに改行、段落は空行区切り）で成果物を書く。 |
| reviewer | stage 定義の `reviewer` と `reviewer_max_iterations` による gate 前の独立 sub-agent レビュー | stage gate の人間承認、phase PR と Bolt PR のレビューと CI、`amadeus-validator` へ写像 | 本家でも最終判断は人間に残るため、承認境界を変えずに gate 契約へ寄せる。詳細は [AI-DLC v2 Reviewer Mapping](../aidlc-v2-reviewer-mapping.ja.md)。 |
| sensor | stage 定義の `sensors:` による決定論的検査（`.amadeus-sensors/` へ出力） | `required-sections` と `upstream-coverage` は `amadeus-validator` と `traceability.md` へ、`linter` と `type-check` は Build and Test の記録と PR の CI へ写像 | 配布契約に hook 実行基盤を追加しない。詳細は [AI-DLC v2 Sensor and Learn Mapping](../aidlc-v2-sensor-learn-mapping.ja.md)。 |
| Learn | `memory.md` の 4 見出しと learnings ritual による harness への定着 | 各 stage の `memory.md`（同じ 4 観点）、`decisions.md`、`traceability.md`、Grilling Decision Trail へ写像 | 定着は自動化せず人間 gate を経る。詳細は [AI-DLC v2 Sensor and Learn Mapping](../aidlc-v2-sensor-learn-mapping.ja.md)。 |
| Build and Test の失敗時処理 | 診断と修正を最大 2 回試み、解決できない場合に記録して gate へ進む | 実装修正を行わず、失敗時は halt-and-ask で即座に人間へ確認し、修正は Code Generation の責務として扱う | 記録の真実性と Bolt gate の承認対象を保つ。詳細は [AI-DLC v2 Build and Test Failure Handling](../aidlc-v2-build-and-test-failure-handling.ja.md)。 |
| Operation phase | 7 stage を実行対象に含む | record の scaffold と Stage Progress の `[S]` 行だけを持ち、実行対象にしない | 成果物契約、gate、validator、PR 境界が実環境への作用を扱わないため。詳細は [AI-DLC v2 Operation Phase Boundary](../aidlc-v2-operation-phase-boundary.ja.md)。 |

## 旧契約からの主な変更

| 旧契約 | 本契約 |
|---|---|
| `amadeus-discovery`（事前の Intent 候補分割） | 退役。Intake の合流判定とスコープバックログが置き換える。 |
| phase 別公開入口（`amadeus-ideation` など） | 退役。単一入口に統合する。 |
| use-cases ステージ | 退役。user-stories と Functional Design が担う。 |
| `ideation/scope.md` | `scope-definition/scope-document.md` と `intent-backlog.md` が置き換える。 |
| `ideation/ideation.md` | `feasibility/feasibility-assessment.md` と `constraint-register.md` が置き換える。 |
| `ideation/mocks/*.puml` | `rough-mockups/wireframes.md` と `user-flow.md` が置き換える。図は PlantUML または Mermaid で内包できる。 |
| `inception/acceptance.md` | 退役。受け入れ条件は `requirements.md` の各要求に内包する。 |
| Unit Design Brief（`units/<unit-id>/design.md`） | 退役。Application Design と Functional Design が置き換える。 |
| `inception/bolts.md` | `delivery-planning/bolt-plan.md` が置き換える。 |
| Bolt preparation の `tasks.md` | `code-generation/code-generation-plan.md` が置き換える。 |
| ステージごとの phase PR | phase 境界と Bolt 完了だけを PR にする。 |

## 文書構成

- [scopes.md](scopes.ja.md)：scope、depth、scope とステージの対応表。
- [ideation.md](ideation.ja.md)：Ideation 7 ステージの契約。
- [inception.md](inception.ja.md)：Inception 8 ステージの契約。
- [construction.md](construction.ja.md)：Construction 7 ステージの契約。
- [state.md](state.ja.md)：`amadeus-state.md` の構造とステージ状態機械。
