# Ideation フェーズ -- ステージリファレンス (1.1-1.7)

> 言語: [English](ideation.md) | **日本語**

## フェーズ概要

Ideation フェーズは AI-DLC ライフサイクルにおける5フェーズのうち2番目のフェーズです。技術的な作業を開始する前に、intent を捕捉し、実現可能性を検証し、スコープを定義し、承認を確保することで、イニシアチブ全体の基盤を確立します。このフェーズはステージ1.1から1.7までを実行し、Inception フェーズへの移行を制御する go/no-go ゲートで締めくくられます。

7つのステージはすべてインラインで実行され(サブエージェント委譲なし)、承認ゲート・質問フォーマット・完了メッセージについては標準の stage-protocol.md に従います。オーケストレーターはこれらを順次ルーティングし、現在のスコープに適用されない CONDITIONAL ステージはスキップします。

**Ideation フェーズの主な特徴:**

- すべてのステージはインライン実行モード(ユーザーとの直接的な会話)を使用します。
- ステージは intent のレコードディレクトリ配下の `<record>/ideation/<stage-name>/` に成果物を生成します。ここで `<record>` は `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` です(`audit/` シャードディレクトリ、ステージごとの `memory.md`、検証レポートも同じレコードディレクトリ配下に置かれます)。
- ステージ1.1を除くすべてのステージは、より早いステージの出力に依存します。
- ステージ1.7は Inception へ引き継ぐ前にフェーズ境界の検証チェックを実行します。
- このフェーズは2つの ALWAYS ステージ(1.1 Intent Capture と 1.7 Approval & Handoff)で挟まれています。中間の5つのステージは CONDITIONAL であり、スコープに応じてスキップされる場合があります。

**スコープ駆動のステージ包含:**

| スコープ         | 含まれるステージ                            |
|------------------|---------------------------------------------|
| enterprise       | 1.1-1.7 すべて                            |
| feature          | 1.1-1.7 すべて                            |
| mvp              | 1.1, 1.3 (light), 1.4, 1.6                  |
| poc              | 1.1 (最小限)                               |
| bugfix           | なし(Ideation は完全にスキップ)          |
| chore            | なし(Ideation は完全にスキップ)          |
| refactor         | なし(Ideation は完全にスキップ)          |
| infra            | なし(Ideation は完全にスキップ)          |
| security-patch   | なし(Ideation は完全にスキップ)          |
| workshop         | なし(Ideation は完全にスキップ)          |

---

## ステージ概要テーブル

| ステージ | 名前                        | 条件        | リードエージェント | サポートエージェント                        | モード |
|-------|-----------------------------|-------------|-----------------|---------------------------------------------|--------|
| 1.1   | Intent Capture & Framing    | ALWAYS      | amadeus-product-agent   | amadeus-architect-agent                             | inline |
| 1.2   | Market Research             | CONDITIONAL | amadeus-product-agent   | --                                          | inline |
| 1.3   | Feasibility & Constraints   | CONDITIONAL | amadeus-architect-agent | amadeus-aws-platform-agent, amadeus-compliance-agent        | inline |
| 1.4   | Scope Definition            | ALWAYS      | amadeus-product-agent   | amadeus-delivery-agent                              | inline |
| 1.5   | Team Formation              | CONDITIONAL | amadeus-delivery-agent  | --                                          | inline |
| 1.6   | Rough Mockups               | CONDITIONAL | amadeus-design-agent    | amadeus-product-agent                               | inline |
| 1.7   | Approval & Handoff          | ALWAYS      | amadeus-delivery-agent  | amadeus-product-agent                               | inline |

---

## ステージ 1.1: Intent Capture & Framing

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.1                                                                    |
| 条件             | ALWAYS -- すべてのワークフローの最初のステージ。イニシアチブの基盤を確立する |
| リードエージェント | amadeus-product-agent                                                          |
| サポートエージェント | amadeus-architect-agent(技術的コンテキスト)                                    |
| モード           | inline                                                                 |
| 完了絵文字       | :bulb:                                                                 |

### 目的

Intent Capture はすべての AI-DLC ワークフローのエントリポイントです。ビジネス上の問題を捕捉し、ステークホルダーを特定し、成功指標を確立し、プロジェクトタイプ(greenfield、brownfield、migration)を分類します。得られた intent ステートメントとステークホルダーマップは、以降のすべてのステージが積み上げる基盤となります。

ユーザーが `$ARGUMENTS` を通じてフリーフォームの intent テキストを提供した場合、そのテキストはシードコンテキストとして渡され、このステージが「何を作りたいのか?」を再度尋ねないようにします。

### 入力

- `$ARGUMENTS` またはインテントの `audit/` シャードからのユーザーのプロジェクト説明
- 過去のセッションからの既存の `<record>/` 成果物(存在する場合)
- `amadeus/spaces/<space>/memory/` からのガードレール

### 手順

1. **エージェントペルソナのロード** -- amadeus-product-agent のペルソナと知識をロードする。技術的コンテキストの視点として amadeus-architect-agent のペルソナをロードする。
2. **過去コンテキストのロード** -- ユーザーのプロジェクト説明を読む。既存の成果物を確認する。ガードレールをロードする。
3. **明確化質問の生成** -- `<record>/ideation/intent-capture/intent-capture-questions.md` を作成し、ビジネス上の問題、顧客、成功指標、イニシアチブのトリガー、プロジェクトタイプをカバーする質問を含める。A-E の選択肢と X(その他)を伴う `[Answer]:` タグ形式を使用する。インタラクションモードの質問フローを提供する。
4. **回答の収集と分析** -- すべてのタグが埋まっていることを確認する。曖昧さ/矛盾の分析を実行する。
5. **成果物の生成** -- intent ステートメントとステークホルダーマップを生成する。
6. **状態の更新** -- 1.1 を `[x]` 完了としてマークする。
7. **完了の提示と承認の要求** -- 標準の2オプションゲート。

### 出力

| ファイル                      | 内容                                                          |
|-------------------------------|---------------------------------------------------------------|
| `intent-statement.md`         | 問題ステートメント、ターゲット顧客、成功指標、イニシアチブのトリガー、プロジェクトタイプ、初期スコープシグナル |
| `stakeholder-map.md`          | 主要なステークホルダーと関心事、意思決定者 vs. 影響者、コミュニケーション要件 |
| `intent-capture-questions.md` | `[Answer]:` タグ付きの明確化質問(入力成果物) |

### 備考

- すべてのワークフローの最初のステージ。ユーザー入力以外に過去の成果物はない。
- `$ARGUMENTS` 内のフリーフォーム intent はシードコンテキストとして使用される。
- intent ステートメントは以降のすべての Ideation ステージに供給され、Inception へと引き継がれる。

---

## ステージ 1.2: Market Research & Competitive Analysis

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.2                                                                    |
| 条件             | CONDITIONAL -- 内部ツール、バグ修正、リファクタではスキップ           |
| リードエージェント | amadeus-product-agent                                                          |
| サポートエージェント | (なし)                                                                 |
| モード           | inline                                                                 |
| 完了絵文字       | :bar_chart:                                                            |

### 目的

イニシアチブを外部の競合状況と照らし合わせて検証します。競合分析、市場トレンド、ビルド vs. バイの評価、差別化戦略を生成します。

### 入力

- ステージ1.1からの intent ステートメント

### 出力

| ファイル                        | 内容                                                        |
|---------------------------------|-------------------------------------------------------------|
| `competitive-analysis.md`       | 競合状況、競合プロファイル、強み/弱み |
| `market-trends.md`              | 業界トレンド、規制の変化、市場規模             |
| `build-vs-buy.md`               | ビルド vs. バイ vs. パートナーの評価                          |
| `market-research-questions.md`  | `[Answer]:` タグ付きの明確化質問                  |

### 備考

- スキップ条件: 内部ツール、バグ修正、リファクタ、インフラのみ、セキュリティパッチ、poc スコープ。
- ステージ1.3 Feasibility(実行された場合)とステージ1.4 Scope Definition に供給される。

---

## ステージ 1.3: Feasibility & Constraint Analysis

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.3                                                                    |
| 条件             | CONDITIONAL -- 些細な変更ではスキップ。技術的リスクやコンプライアンスの必要がある場合は実行 |
| リードエージェント | amadeus-architect-agent(技術的実現可能性)                                |
| サポートエージェント | amadeus-aws-platform-agent(AWS ランドスケープ)、amadeus-compliance-agent(規制スキャン) |
| モード           | inline                                                                  |
| 完了絵文字       | :test_tube:                                                            |

### 目的

技術的な実行可能性を評価し、制約を特定し、RAID ログ(Risks、Assumptions、Issues、Dependencies)を確立します。マルチエージェントステージ: architect がリードし、その後 aws-platform と compliance が入力を提供します。

### 入力

- ステージ1.1からの intent ステートメント
- ステージ1.2からの市場調査(実行された場合)

### 出力

| ファイル                     | 内容                                                           |
|------------------------------|----------------------------------------------------------------|
| `feasibility-assessment.md`  | 技術的な実行可能性、リスク分析                             |
| `constraint-register.md`     | 技術的、組織的、規制上の制約          |
| `raid-log.md`                | Risks、Assumptions、Issues、Dependencies                       |
| `feasibility-questions.md`   | `[Answer]:` タグ付きの明確化質問                     |

### 備考

- mvp スコープでは「light」深度で実行される。
- マルチエージェントパターン: オーケストレーターはまずリードエージェントを実行し、次にリードの出力をコンテキストとしてサポートエージェントを実行する。

---

## ステージ 1.4: Scope Definition & Prioritization

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.4                                                                    |
| 条件             | ALWAYS -- 深度はスコープに適応する                                     |
| リードエージェント | amadeus-product-agent                                                          |
| サポートエージェント | amadeus-delivery-agent(キャパシティの現実確認)                                |
| モード           | inline                                                                 |
| 完了絵文字       | :dart:                                                                 |

### 目的

スコープ境界を確立します。MoSCoW、WSJF、または RICE の優先順位付けとバリューストリームマップを用いて、優先順位付けされた intent バックログ(作業の proto-unit)を生成します。

### 入力

- ステージ1.1からの intent ステートメント
- ステージ1.3からの実現可能性評価(存在する場合)

### 出力

| ファイル                          | 内容                                                      |
|-----------------------------------|-----------------------------------------------------------|
| `scope-document.md`               | スコープの内/外境界の定義                          |
| `intent-backlog.md`               | proto-unit の優先順位付けバックログ(MoSCoW/WSJF/RICE)    |
| `scope-definition-questions.md`   | `[Answer]:` タグ付きの明確化質問                |

### 備考

- 常に実行され、深度はスコープに適応する。
- スコープドキュメントはプロジェクト全体の権威ある境界となる。

---

## ステージ 1.5: Team Formation & Mob Planning

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.5                                                                    |
| 条件             | CONDITIONAL -- ソロ開発者または小規模チームのプロジェクトではスキップ  |
| リードエージェント | amadeus-delivery-agent                                                         |
| モード           | inline                                                                 |
| 完了絵文字       | :people_holding_hands:                                                 |

### 目的

チームの可用性を評価し、スキルをマッピングし、ギャップを特定し、mob 構成計画を生成します。

### 入力

- ステージ1.4からのスコープ定義
- ステージ1.3からの実現可能性評価(存在する場合)

### 出力

| ファイル                        | 内容                                                        |
|---------------------------------|-------------------------------------------------------------|
| `team-assessment.md`            | チームの可用性、RACI マトリクス、キャパシティ配分         |
| `skill-matrix.md`               | 必要なスキル vs. 利用可能なスキル、ギャップ分析                 |
| `mob-composition.md`            | mob 構成計画、チームトポロジー                         |
| `team-formation-questions.md`   | `[Answer]:` タグ付きの明確化質問                  |

### 備考

- スキップ条件: ソロ開発者プロジェクト、小規模チーム、poc、bugfix、refactor スコープ。
- ステージ2.8 Delivery Planning に供給される。

---

## ステージ 1.6: Rough Mockups & Concept Visualization

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.6                                                                    |
| 条件             | CONDITIONAL -- 非UI、APIのみ、またはインフラのみではスキップ           |
| リードエージェント | amadeus-design-agent                                                           |
| サポートエージェント | amadeus-product-agent(intent と照合して検証)                               |
| モード           | inline                                                                 |
| 完了絵文字       | :pencil2:                                                              |

### 目的

初期のコンセプトビジュアライゼーションを生成します。UI 向け: 低忠実度のワイヤーフレームとユーザーフロー図。非UI 向け: システムコンテキスト図とインタラクションフローのスケッチ。すべての図は stage-protocol.md の ASCII 標準に従います。

### 入力

- ステージ1.1からの intent ステートメント
- ステージ1.4からのスコープ定義

### 出力

| ファイル                      | 内容                                                           |
|-------------------------------|----------------------------------------------------------------|
| `wireframes.md`               | 低忠実度のワイヤーフレーム(UI)またはシステムコンテキスト図(非UI) |
| `user-flow.md`                | 中核となるユーザーフロー図(UI)またはインタラクションフローのスケッチ(非UI) |
| `rough-mockups-questions.md`  | `[Answer]:` タグ付きの明確化質問                     |

### 備考

- スキップ条件: 非UI、APIのみ、またはインフラのみのイニシアチブ。
- Inception のステージ2.5 Refined Mockups に供給される(そのステージも実行される場合)。

---

## ステージ 1.7: Initiative Approval & Handoff

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| フェーズ         | Ideation                                                               |
| ステージ #       | 1.7                                                                    |
| 条件             | ALWAYS -- Inception 前の最終 Ideation ゲート                          |
| リードエージェント | amadeus-delivery-agent                                                         |
| サポートエージェント | amadeus-product-agent(完全性を検証)                                 |
| モード           | inline                                                                 |
| 完了絵文字       | :white_check_mark:                                                     |

### 目的

すべての Ideation 成果物を単一のイニシアチブブリーフにまとめ、すべての決定を記録し、フェーズ境界の検証を実行し、go/no-go ゲートを提示します。

### 入力

ステージ1.1-1.6 からのすべての Ideation フェーズ成果物。

### 手順

1. amadeus-delivery-agent のペルソナと知識をロードする。
2. すべての Ideation フェーズ成果物を読む。
3. 承認質問を生成する。
4. イニシアチブブリーフ(すべての出力を組み合わせた1ページャー)をまとめる。
5. フェーズ境界の検証(Intent -> Scope -> Intent Backlog の一貫性)。
6. 状態を更新し、INCEPTION フェーズへ遷移する。
7. 3オプションの承認ゲートを提示する。

### 出力

| ファイル                          | 内容                                                      |
|-----------------------------------|-----------------------------------------------------------|
| `initiative-brief.md`             | すべての Ideation 出力を組み合わせた1ページの要約           |
| `decision-log.md`                 | Ideation 中に行われたすべての決定の記録              |
| `approval-handoff-questions.md`   | `[Answer]:` タグ付きの承認質問                  |

フェーズ境界の検証:

| ファイル                                      | 内容                                        |
|-----------------------------------------------|---------------------------------------------|
| `<record>/verification/phase-check-ideation.md` | Ideation から Inception へのトレーサビリティチェック |

### 承認ゲート

特別な3オプションゲート:

- **Approve** -- Inception フェーズへ進む
- **Request Changes** -- 修正フィードバックを提供する
- **Reject Initiative** -- ワークフローを完全に終了する

### 備考

- フェーズ境界ステージ -- stage-protocol のガバナンスに従って検証を実行する。
- イニシアチブブリーフは Ideation フェーズ全体のエグゼクティブサマリーとして機能する。

---

## フェーズ概要

### 主な出力

1. **Intent Statement** (1.1) -- 問題ステートメント、ターゲット顧客、成功指標、プロジェクト分類。
2. **Stakeholder Map** (1.1) -- 主要なステークホルダー、意思決定者、コミュニケーション要件。
3. **Competitive Analysis** (1.2) -- 市場ポジショニング、ビルド vs. バイ(該当する場合)。
4. **Feasibility Assessment and RAID Log** (1.3) -- 技術的な実行可能性、リスクレジスタ、制約(該当する場合)。
5. **Scope Document and Intent Backlog** (1.4) -- 権威あるスコープ境界、優先順位付けされた proto-unit リスト。
6. **Team Plan** (1.5) -- スキルマトリクス、mob 構成、キャパシティ配分(該当する場合)。
7. **Concept Mockups** (1.6) -- ワイヤーフレーム/ユーザーフローまたはシステムコンテキスト図(該当する場合)。
8. **Initiative Brief** (1.7) -- すべての Ideation 出力を統合したエグゼクティブ1ページャー。
9. **Phase Boundary Verification** (1.7) -- トレーサビリティチェックの結果。

### Inception への引き継ぎ

ステージ1.7での承認により、フレームワークは Inception フェーズへ遷移します。Inception はステージ2.1 Reverse Engineering(brownfield プロジェクトの場合)またはステージ2.3 Requirements Analysis(greenfield プロジェクトの場合)から始まります。

## 相互参照

- [Orchestrator](../03-orchestrator.ja.md) -- ルーティングロジック、スコープからステージへのマッピング
- [Stage Protocol](../04-stage-protocol.ja.md) -- 承認ゲート、質問フォーマット、フェーズ境界の検証
- [Inception Stages](inception.ja.md) -- 次のフェーズ
- [Initialization Stages](initialization.ja.md) -- 前のフェーズ
