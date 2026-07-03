# Amadeus Lifecycle Contract Overview

## 位置づけ

この文書群は、[Issue #369](https://github.com/amadeus-dlc/amadeus/issues/369) で確定した v2 互換ライフサイクルの目標契約である。

AI-DLC v2（[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) の `v2` ブランチ）の Ideation、Inception、Construction の仕様を、意味論互換で Amadeus に実装するための契約を定義する。

旧モデルの段階別契約（docs/amadeus/stages/）は、#369 の退役 wave で本契約に置き換えて削除した。steering layer の契約は [steering.md](../steering.md) を参照する。
置き換えまでの間、稼働中の skill は旧契約に従い、#369 の実装作業は本契約に従う。

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
- モジュールファイルとモジュールディレクトリの対で配置する。
- 状態は `state.json` で管理する。
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

公開入口は Intake を行い、対象 Intent の `state.json` を読み、scope とステージ進行状態から次に実行するステージを解決し、対応する内部 skill を呼び出す。

ユーザーは phase やステージを選ばない。
phase とステージの解決は入口の責務である。

中断した Intent は、次の入口呼び出しで `state.json` の中断点から再開する。

補助入口は独立したまま維持する。
`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-domain-grilling`、`amadeus-event-storming`、`amadeus-steering`、`amadeus-validator` は本契約の対象外である。

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
承認は approval evidence として `state.json` に記録する。

**Bolt ゲート**：Construction の Bolt 実行に適用するゲートである。
最初の Bolt（walking skeleton）は、設計成果物と生成コードをまとめて必ず人間が承認する。
walking skeleton の承認直後に、残りの Bolt を自律実行するかゲートを続けるかを一度だけ確認する（ladder 提案）。
自律実行中も、失敗時は停止して人間に確認する（halt-and-ask）。

**phase ゲート**：phase 境界（Ideation 完了、Inception 完了）と Bolt 完了は PR と人間 merge で確定する。
ステージごとに PR を作らない。
PR の単位を phase と Bolt に限定することで、ステージ承認の往復を会話内に収め、PR 往復のコストを抑える。

## 質問プロトコル

各ステージは、確認が必要な論点を questions ファイル（`questions.md`）として stage ディレクトリに残す。

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

Intent の成果物は次の配置にする。

```text
.amadeus/
  intents.md                          # レジストリ（生成物）
  active-intent                       # カーソル（gitignore、Intake の継続判定が読む）
  intents/
    <intent-id>-<slug>.md             # Intent のモジュールファイル（intent-statement 相当）
    <intent-id>-<slug>/
      state.json                      # scope、depth、ステージ進行状態
      ideation/
        <stage-slug>/                 # ステージごとの成果物と questions.md
        decisions.md                  # phase の判断（decision-log 相当）
        traceability.md               # Amadeus 拡張
        grillings.md                  # Grilling Decision Trail 索引
        grillings/
      inception/
        <stage-slug>/
        decisions.md
        traceability.md
        grillings.md
        grillings/
      construction/
        <unit-id>-<slug>/
          <stage-slug>/               # Unit 単位ステージ（3.1〜3.5）の成果物
        bolts/
          <bolt-id>-<slug>/           # Bolt 実行記録（build-and-test、pr.md）
        ci-pipeline/                  # Intent 単位（3.7）
        decisions.md
        traceability.md
        grillings.md
        grillings/
```

Intent のモジュールファイルは v2 の intent-statement に対応し、目的（問題）、対象（誰の価値か）、成功条件（成功指標）、契機、目標プロファイル、範囲、依存を扱う。

コードベース知識（v2 の codekb）は Intent をまたいで再利用するため、steering layer 配下の `.amadeus/knowledge/codebase/<repo>/` に置く。

## v2 との構造差分

意味論互換の範囲で、次の差分を意図的に持つ。

| 項目 | v2 | Amadeus | 理由 |
|---|---|---|---|
| Operation phase | 7 ステージあり | 対象外 | Amadeus は Operation 成果物を作らない方針を維持する。 |
| Initialization phase | 3 ステージあり | 対象外 | workspace の初期化と検出は `amadeus-steering` が担う。 |
| Persona agent | 11 の persona 定義 | 不採用 | ステージの専門性は各内部 skill が内包する。 |
| Sensor | sensor manifest と自動検証 | `amadeus-validator` | 構造検証は validator の責務として一元化する。 |
| Intent の識別子 | UUIDv7 と YYMMDD ディレクトリ | `<YYYYMMDD>-<slug>` | 既存の採番を維持する。同日同名は連番で区別する。 |
| Space | 複数チームの space | 不採用 | 単一 workspace を前提にする。必要になった場合に別 Intent で扱う。 |
| 質問の提示 | 質問ファイルへの一括記入または対話 | grilling プロトコル | 一問ずつ、推奨回答付きの既存契約を使う。 |
| 監査証跡 | audit ログと runtime graph | traceability と decisions と grillings | 既存の追跡成果物を維持する。 |

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
| Bolt preparation の `tasks.md` | `code-generation/plan.md`（code-generation-plan 相当）が置き換える。 |
| ステージごとの phase PR | phase 境界と Bolt 完了だけを PR にする。 |

## 文書構成

- [scopes.md](scopes.md)：scope、depth、scope とステージの対応表。
- [ideation.md](ideation.md)：Ideation 7 ステージの契約。
- [inception.md](inception.md)：Inception 8 ステージの契約。
- [construction.md](construction.md)：Construction 7 ステージの契約。
- [state.md](state.md)：`state.json` スキーマとステージ状態機械。
