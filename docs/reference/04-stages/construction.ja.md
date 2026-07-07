# Construction フェーズ -- ステージリファレンス (3.1-3.7)

## フェーズ概要

Construction フェーズは、Inception で作成された設計成果物を、動作しテスト済みの
ソフトウェアへと変換します。7つのステージ(3.1 から 3.7)をカバーし、機能設計、
非機能要件と設計、インフラストラクチャ設計、コード生成、ビルド/テスト検証、
CI パイプライン設定にわたります。

Construction は AI-DLC 方法論における5フェーズのうち4番目です。Delivery Planning
(ステージ 2.8)で作成された**実行計画**によって駆動されます。この計画が、どのステージ
を実行し、どれをスキップし、どの順序でユニットを構築するかを決定します。

すべてのステージは、承認ゲート、質問形式、完了メッセージ、状態追跡について
`stage-protocol.md` に従います。

> **パス規約。** 各ワークフローの成果物は、その**intent record
> dir** — `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(`<space>` は
> 非デフォルトの space が使われていない限り `default`、`<YYMMDD>-<label>` は
> intent ディレクトリ: `260624` のようなコンパクトな UTC 日付プレフィックスと
> 短い kebab-case ラベルで、record が時系列にソートされる) — 配下に置かれます。
> 以下では、`<record>/` はそのディレクトリの略記です。例:
> `<record>/construction/{unit-name}/functional-design/` は
> `amadeus/spaces/default/intents/<YYMMDD>-<label>/construction/{unit-name}/functional-design/`
> に展開されます。ディレクトリ名は人間が読めるラベルであり、正規の識別子は
> `intents.json` レジストリ行に格納された UUIDv7 です。(per-intent レイアウト以前に
> 作成されたプロジェクトはフラットツリーを使っていました。エンジンが初回実行時に
> 移行します。)

---

## Bolt ごとの Construction

Construction は **Bolt ごと**に実行され、ステージ 2.8 の `bolt-plan.md`(Bolt
シーケンス + walking-skeleton マーカー)とステージ 2.7 の依存 DAG によって駆動
されます。[Bolt](../../guide/glossary.ja.md) は、1つのユニットまたは依存関係でリンク
された少数のユニット群に対する、ステージ 3.1–3.5 の1回のパスです。ステージ 3.6
(Build and Test)と 3.7(CI Pipeline)は、全 Bolt にわたって最後に**1回だけ**実行
されます。

```
Bolt 1 (walking skeleton) — 常にゲートされる:
  Questions (3.1–3.4 を Bolt のユニット横断で QUESTION-ONLY モードで)
  → Answers ゲート (Bolt レベル)
  Design artifacts (3.1–3.4 を ARTIFACT-ONLY モードで)
  Code generation (3.5 を Task 委譲でユニットごとに)
  → Walking-skeleton ゲート
  → Ladder プロンプト (1回発火): "autonomous" または "gated"
  → Construction Autonomy Mode を state に書き込む

Bolt 2..N — autonomy モードがゲートを統括する:
  (並列適格な Bolt はバッチとして実行される。単一のバッチレベルゲートが
   その中の全 Bolt をカバーする。)
  Questions → Answers ゲート (Bolt レベル) → Design → Code-gen → Bolt/batch
  ゲート (autonomous ならスキップ)。失敗は常に停止して問い合わせる。

全 Bolt の後:
  3.6 Build and Test (フルコードベース横断で1回実行)
  3.7 CI Pipeline    (条件付きで1回実行)
```

各設計ステージファイル(3.1–3.4)は QUESTION-ONLY と ARTIFACT-ONLY の実行モードを
サポートします — 詳細は各ステージファイルを参照してください。`code-generation.md`
内のユニットごとの承認ゲートは、通常の Bolt 実行中は**エンジンによって抑制**され、
単一の Bolt レベル(またはバッチレベル)ゲートがそれを置き換えます。ユニットごとの
ゲートは直接呼び出し用途(例: `/amadeus --stage code-generation`)のために残されます。

**並列バッチ。** 2つ以上の Bolt が依存充足を共有し、互いに依存しない場合、
コンダクターはそれらの Code Generation ステージを、1つのアシスタントメッセージ内で
N 個の `Task` 呼び出しを発行することにより並行してディスパッチします。1つの
バッチレベルゲートがそれらすべてをカバーします。監査イベント(`BOLT_STARTED`、
`BOLT_COMPLETED`)は `Batch=N` フィールドを持つため、兄弟 Bolt はログから復旧
可能です。

**失敗処理。** Bolt の失敗は、autonomy モードに関わらず常に Construction を停止
します。選択肢は retry(失敗した Bolt だけを再実行)、skip(`[S]` をマークして続行 —
依存する Bolt も失敗する可能性がある)、または abort です。並列バッチ内で成功した
兄弟 Bolt は `[x]` ステータスと成果物を保持します。正規の仕様については
`stage-protocol.md` §1 "Construction Bolt gates" と SKILL.md §CONSTRUCTION Flow
を参照してください。

---

## ステージサマリーテーブル

| Stage | Name                  | Execution   | Condition                                                                                          | Lead Agent          | Support Agents    | Mode                       | Per-Unit |
|-------|-----------------------|-------------|----------------------------------------------------------------------------------------------------|---------------------|-------------------|-----------------------------|----------|
| 3.1   | Functional Design     | CONDITIONAL | 新しいデータモデル、複雑なビジネスロジック、またはビジネスルールの設計が必要                             | amadeus-architect-agent     | amadeus-developer-agent   | inline                      | Yes      |
| 3.2   | NFR Requirements      | CONDITIONAL | パフォーマンス、セキュリティ、スケーラビリティの懸念、または技術スタック選定が必要                         | amadeus-architect-agent     | amadeus-devsecops-agent, amadeus-compliance-agent, amadeus-quality-agent   | inline                      | Yes      |
| 3.3   | NFR Design            | CONDITIONAL | NFR Requirements が実行され、NFR パターンの設計が必要                                          | amadeus-architect-agent     | amadeus-aws-platform-agent| inline                      | Yes      |
| 3.4   | Infrastructure Design | CONDITIONAL | インフラストラクチャサービスのマッピング、デプロイアーキテクチャ、またはクラウドリソースが必要   | amadeus-aws-platform-agent  | amadeus-devsecops-agent, amadeus-compliance-agent   | inline                      | Yes      |
| 3.5   | Code Generation       | ALWAYS      | 実行計画内のすべてのユニットに対して常に実行                                               | amadeus-developer-agent     | (none)            | subagent (amadeus-developer-agent)  | Yes      |
| 3.6   | Build and Test        | ALWAYS      | すべてのユニットごとのステージ完了後に常に1回実行                                         | amadeus-quality-agent       | amadeus-devsecops-agent   | inline                      | No       |
| 3.7   | CI Pipeline           | CONDITIONAL | CI パイプラインの作成または大幅な変更が必要な場合に実行                                | amadeus-pipeline-deploy-agent| (none)           | inline                      | No       |

---

## ステージ 3.1: Functional Design

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.1                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (実行計画に従う)                                                                  |
| Condition         | 新しいデータモデル、複雑なビジネスロジック、またはビジネスルールの設計が必要。新しいビジネスロジックを伴わない単純なロジック変更の場合はスキップ。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | amadeus-architect-agent                                                                                   |
| support_agents    | amadeus-developer-agent                                                                                   |
| mode              | inline                                                                                            |
| Inputs            | unit-of-work.md, unit-of-work-story-map.md, requirements.md, application design 成果物         |
| Outputs           | `<record>/construction/{unit-name}/functional-design/` -- business-logic-model.md, business-rules.md, domain-entities.md, CONDITIONAL: frontend-components.md |

### 目的

単一のユニット・オブ・ワークについて、ビジネスロジック、ドメインモデル、ルールを
設計します。amadeus-architect-agent が主導し、amadeus-developer-agent が技術的な
実現可能性のインプットを提供します。

### 入力

- `<record>/inception/units-generation/unit-of-work.md` からのユニット定義
- `<record>/inception/units-generation/unit-of-work-story-map.md` からの割り当てストーリー
- `<record>/inception/requirements-analysis/requirements.md` からの要件
- `<record>/inception/application-design/` からのアプリケーション設計成果物

### 手順

1. **Load Personas** -- amadeus-architect-agent(lead)のペルソナと知識をロード。
   技術実装のインプット用に amadeus-developer-agent のペルソナと知識をロード。
   amadeus-architect-agent を主要な視点として適用。

2. **Read Unit Context** -- ユニット定義、割り当てストーリー、要件、アプリケーション
   設計成果物を読む。

3. **Create Functional Design Plan** -- ユニットのスコープを分析し、
   `<record>/construction/{unit-name}/functional-design/functional-design-questions.md`
   に `[Answer]:` タグを使った文脈に適した質問ファイルを作成する。フォーカス領域:
   - ビジネスロジックのワークフローとアルゴリズム
   - ドメインモデルとエンティティ関係
   - ビジネスルール、制約、バリデーションロジック
   - データフローと変換
   - 他ユニットや外部システムとの統合ポイント
   - エラーハンドリングとエッジケース
   - フロントエンドコンポーネント(コンポーネント階層、props/state、インタラクション
     フロー、フォームバリデーション)
   - ビジネスシナリオ(エンドツーエンドのユーザージャーニー、ハッピー/アンハッピー
     パス、並行性エッジケース)

4. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従って回答を
   収集する(インタラクションモードの選択を提示し、回答を収集し、ファイルへ書き戻す)。
   必須の曖昧性分析を実施する:
   - 曖昧な回答(「mix of」「not sure」「depends」「probably」)を特定
   - 回答間の矛盾をチェック
   - 成果物生成に必要な欠落した詳細をフラグ
   - 曖昧さが1つでも見つかった場合: フォローアップ質問を作成し、進行前に解決する

5. **Generate Artifacts** -- 以下を
   `<record>/construction/{unit-name}/functional-design/` に生成する:
   - **business-logic-model.md**: ユニットのビジネスロジックに関する詳細な
     アルゴリズム、ワークフロー、データ変換、処理シーケンス、意思決定木
   - **business-rules.md**: 意思決定ルール、バリデーションロジック、制約、
     ポリシー、条件付き動作、ビジネス不変条件
   - **domain-entities.md**: エンティティ、関係、データ構造、属性、ライフサイクル
     状態、エンティティ間インタラクションパターン
   - **frontend-components.md**(CONDITIONAL -- ユニットがフロントエンド/UI を含む
     場合のみ): コンポーネント階層、props/state 設計、インタラクションフロー、
     フォームバリデーションルール、API 統合ポイント

6. **Update State** -- `<record>/amadeus-state.md` を更新: {unit-name} の Functional
   Design を `[x]` 完了としてマークし、"Current Status" を更新。

7. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                 | Description                                                              |
|--------------------------|--------------------------------------------------------------------------|
| business-logic-model.md  | アルゴリズム、ワークフロー、データ変換、処理シーケンス、意思決定木 |
| business-rules.md        | 意思決定ルール、バリデーションロジック、制約、ポリシー、条件付き動作 |
| domain-entities.md       | エンティティ、関係、データ構造、属性、ライフサイクル状態   |
| frontend-components.md   | (CONDITIONAL) コンポーネント階層、props/state、インタラクションフロー、フォームバリデーション、API 統合 |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記

- 質問ファイルは
  `<record>/construction/{unit-name}/functional-design/functional-design-questions.md`
  でステージ成果物と同じ場所に配置される。
- frontend-components.md はユニットがフロントエンド/UI 作業を含む場合のみ生成される。
- すべての質問はインタラクションモードフロー(Guide me / Grill me / I'll edit the
  file / Chat)を使用する。

---

## ステージ 3.2: NFR Requirements

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.2                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (実行計画に従う)                                                                  |
| Condition         | パフォーマンス要件、セキュリティ考慮事項、スケーラビリティの懸念、または技術スタック選定が必要。NFR 要件がなく技術スタックがすでに決定済みの場合はスキップ。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | amadeus-architect-agent                                                                                   |
| support_agents    | amadeus-devsecops-agent, amadeus-compliance-agent, amadeus-quality-agent                                       |
| mode              | inline                                                                                            |
| Inputs            | functional design 成果物, requirements.md, RE 成果物                                        |
| Outputs           | `<record>/construction/{unit-name}/nfr-requirements/` -- performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md |

### 目的

単一のユニットについて、パフォーマンス、セキュリティ、スケーラビリティ、信頼性、
技術選定にわたる非機能要件を定義します。amadeus-architect-agent が主導し、
amadeus-devsecops-agent がセキュリティのインプット、amadeus-compliance-agent が
規制のインプット、amadeus-quality-agent がテスト可能性と測定可能性のインプットを
提供します。

### 入力

- `<record>/construction/{unit-name}/functional-design/` からの機能設計成果物
  (存在する場合)
- `<record>/inception/requirements-analysis/requirements.md` からの要件
- `<record>/inception/reverse-engineering/` からのリバースエンジニアリング成果物
  (存在する場合)

### 手順

1. **Load Personas** -- amadeus-architect-agent(lead)のペルソナと知識をロード。
   サポートインプット用に amadeus-devsecops-agent(セキュリティ要件)、
   amadeus-compliance-agent(規制要件)、amadeus-quality-agent(テスト可能性)の
   ペルソナと知識をロード。

2. **Read Prior Artifacts** -- 機能設計成果物(存在する場合)、要件、リバース
   エンジニアリング成果物を読む。

3. **Assess NFR Categories** -- NFR カテゴリ横断でユニットを分析する:
   - **Performance**: レスポンスタイム、スループット、レイテンシ目標、リソース
     使用率
   - **Security**: 認証、認可、データ保護、コンプライアンス要件
   - **Scalability**: 負荷処理、成長予測、スケーリング戦略
   - **Reliability**: 可用性目標、フォールトトレランス、ディザスタリカバリ、
     データ耐久性
   - **Observability**: モニタリング、ロギング、アラート、トレーシング要件

4. **Generate Questions** -- 不明確な NFR 領域について、
   `<record>/construction/{unit-name}/nfr-requirements/nfr-requirements-questions.md`
   に `[Answer]:` タグを使った質問ファイルを作成する。定量化可能な目標と具体的な
   制約にフォーカスする。

5. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従って回答を
   収集する。必須の曖昧性分析を実施する:
   - 曖昧な回答(「fast enough」「highly available」「secure」)を特定
   - NFR 目標間の矛盾をチェック
   - 欠落した定量的目標をフラグ
   - 曖昧さが1つでも見つかった場合: フォローアップ質問を作成し、進行前に解決する

6. **Generate Artifacts** -- 以下を
   `<record>/construction/{unit-name}/nfr-requirements/` に生成する:
   - **performance-requirements.md**: レスポンスタイム目標、スループット要件、
     レイテンシバジェット、リソース制約、ベンチマーク
   - **security-requirements.md**: 認証要件、認可モデル、データ保護、
     コンプライアンス、脅威の考慮
   - **scalability-requirements.md**: 負荷予測、スケーリングトリガー、
     キャパシティプランニング、データ成長、並行性目標
   - **reliability-requirements.md**: 可用性目標(SLA/SLO)、フォールト
     トレランス要件、バックアップ/リカバリ、グレースフルデグラデーション
   - **tech-stack-decisions.md**: 技術選定と根拠 -- 言語、フレームワーク、
     データベース、インフラツール、および各選択の正当化

7. **Update State** -- `<record>/amadeus-state.md` を更新: {unit-name} の NFR
   Requirements を `[x]` 完了としてマークし、"Current Status" を更新。

8. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                     | Description                                                                |
|------------------------------|----------------------------------------------------------------------------|
| performance-requirements.md  | レスポンスタイム、スループット、レイテンシバジェット、リソース制約、ベンチマーク |
| security-requirements.md     | 認証、認可、データ保護、コンプライアンス、脅威        |
| scalability-requirements.md  | 負荷予測、スケーリングトリガー、キャパシティプランニング、並行性         |
| reliability-requirements.md  | 可用性目標(SLA/SLO)、フォールトトレランス、バックアップ/リカバリ           |
| tech-stack-decisions.md      | 各選択の根拠を伴う技術選定                       |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記 -- NFR 粒度の拡張

このステージは**5つの成果物ファイル**を生成します。これは、NFR Requirements に
対して2ファイルのみを定義する上流リファレンスから拡張されています。これは SKILL.md
(「Deliberate Deviations from Reference」)に文書化された意図的な逸脱です。より細かい
粒度はトレーサビリティを向上させ、単一ドキュメントを過負荷にすることなく懸念事項
ごとのレビューを可能にします。5つのファイルはパフォーマンス、セキュリティ、
スケーラビリティ、信頼性を専用の成果物に分離し、技術選定の根拠のための専用の
tech-stack-decisions.md を追加します。

---

## ステージ 3.3: NFR Design

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.3                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (NFR Requirements が実行された場合のみ)                                               |
| Condition         | NFR Requirements が実行され、NFR パターンの設計が必要。NFR Requirements がスキップされた場合はスキップ。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | amadeus-architect-agent                                                                                   |
| support_agents    | amadeus-aws-platform-agent                                                                                |
| mode              | inline                                                                                            |
| Inputs            | NFR requirements 成果物, functional design 成果物                                           |
| Outputs           | `<record>/construction/{unit-name}/nfr-design/` -- performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md |

### 目的

NFR 要件を具体的な設計パターンとアーキテクチャソリューションに変換します。
amadeus-architect-agent が主導し、amadeus-aws-platform-agent がインフラストラクチャ
とプラットフォームのインプットを提供します。

### 入力

- `<record>/construction/{unit-name}/nfr-requirements/` からの NFR 要件
- `<record>/construction/{unit-name}/functional-design/` からの機能設計成果物
  (存在する場合)
- アーキテクチャコンテキストのための `<record>/inception/application-design/` からの
  アプリケーション設計

### 手順

1. **Load Personas** -- amadeus-architect-agent(lead)のペルソナと知識をロード。
   インフラストラクチャとプラットフォームのインプット用に amadeus-aws-platform-agent
   のペルソナと知識をロード。

2. **Read Prior Artifacts** -- NFR 要件、機能設計成果物(存在する場合)、および
   アーキテクチャコンテキストのためのアプリケーション設計を読む。

3. **Generate Design Questions** -- `[Answer]:` タグを使った文脈に適した質問ファイルを
   `<record>/construction/{unit-name}/nfr-design/nfr-design-questions.md`
   に作成する。フォーカス領域:
   - レジリエンスパターン(サーキットブレーカー、バルクヘッド、フォールバック戦略)
   - スケーラビリティパターン(水平 vs 垂直、データパーティショニング、キャッシュ
     階層)
   - パフォーマンス最適化(レイテンシバジェット、スループット目標、リソース
     プーリング)
   - セキュリティアプローチ(多層防御、ゼロトラスト、暗号化標準)
   - 論理コンポーネント境界(サービス分離、障害ドメイン、影響範囲)

4. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従って回答を
   収集する。必須の曖昧性分析を実施する:
   - 曖昧な回答(「mix of」「not sure」「depends」「probably」)を特定
   - 回答間の矛盾をチェック
   - 成果物生成に必要な欠落した詳細をフラグ
   - 曖昧さが1つでも見つかった場合: フォローアップ質問を作成し、進行前に解決する

5. **Design NFR Solutions** -- 各 NFR カテゴリについて具体的なソリューションを設計
   する:
   - **Performance**: キャッシング戦略、クエリ最適化、コネクションプーリング、
     非同期処理、CDN 利用、遅延読み込み、ページネーション
   - **Security**: 認証フロー、認可モデル、暗号化(保存時および転送時)、入力
     バリデーション、CSRF/XSS 保護、シークレット管理、監査ロギング
   - **Scalability**: 水平/垂直スケーリングアプローチ、ロードバランシング、
     データパーティショニング/シャーディング、キューベースの疎結合、ステートレス設計
   - **Reliability**: サーキットブレーカー、バックオフ付きリトライポリシー、
     ヘルスチェック、グレースフルデグラデーション、フェイルオーバー戦略、データ複製

6. **Generate Artifacts** -- 以下を
   `<record>/construction/{unit-name}/nfr-design/` に生成する:
   - **performance-design.md**: キャッシングアーキテクチャ、最適化戦略、リソース
     プーリング、非同期パターン、パフォーマンスバジェット
   - **security-design.md**: 認証/認可アーキテクチャ、暗号化設計、入力バリデーション
     戦略、セキュリティヘッダー、コンプライアンスコントロール
   - **scalability-design.md**: スケーリングアーキテクチャ、負荷分散、データ
     パーティショニング戦略、キャパシティ閾値、オートスケーリングルール
   - **reliability-design.md**: レジリエンスパターン、サーキットブレーカー設定、
     リトライポリシー、ヘルスチェック設計、フェイルオーバー手順、バックアップ戦略
   - **logical-components.md**: 論理インフラストラクチャコンポーネントインベントリ --
     サービス境界、障害ドメイン、影響範囲マッピング、コンポーネント分離戦略、共有
     リソースの特定。NFR パターンが適用される箇所のコンポーネントレベルのビューを
     提供することで、NFR 設計の決定を Infrastructure Design と橋渡しする。

7. **Update State** -- `<record>/amadeus-state.md` を更新: {unit-name} の NFR Design
   を `[x]` 完了としてマークし、"Current Status" を更新。

8. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact               | Description                                                                     |
|------------------------|---------------------------------------------------------------------------------|
| performance-design.md  | キャッシングアーキテクチャ、最適化戦略、リソースプーリング、非同期パターン |
| security-design.md     | 認証アーキテクチャ、暗号化設計、入力バリデーション、セキュリティヘッダー        |
| scalability-design.md  | スケーリングアーキテクチャ、負荷分散、データパーティショニング、オートスケーリングルール  |
| reliability-design.md  | レジリエンスパターン、サーキットブレーカー、リトライポリシー、フェイルオーバー手順      |
| logical-components.md  | コンポーネントインベントリ、サービス境界、障害ドメイン、影響範囲マッピング  |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記 -- NFR Design の粒度

このステージは**5つの成果物ファイル**(4つの NFR 固有設計と logical-components.md)
を生成します。これは、NFR Design に対して2ファイルのみを定義する上流リファレンスから
拡張されています。これは SKILL.md(「Deliberate Deviations from Reference」)に文書化
された意図的な逸脱です。logical-components.md 成果物は、NFR パターンがコンポーネント
レベルで適用される箇所をマッピングすることで、NFR 設計と Infrastructure Design
(ステージ 3.4)の間の橋渡しとして機能します。

---

## ステージ 3.4: Infrastructure Design

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.4                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (実行計画に従う)                                                                  |
| Condition         | インフラストラクチャサービスのマッピング、デプロイアーキテクチャ、またはクラウドリソースが必要。インフラストラクチャの変更がなく、インフラストラクチャがすでに定義済みの場合はスキップ。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | amadeus-aws-platform-agent                                                                                |
| support_agents    | amadeus-devsecops-agent, amadeus-compliance-agent                                                           |
| mode              | inline                                                                                            |
| Inputs            | NFR design 成果物, application design, functional design                                       |
| Outputs           | `<record>/construction/{unit-name}/infrastructure-design/` -- deployment-architecture.md, infrastructure-services.md, monitoring-design.md, cicd-pipeline.md, CONDITIONAL: shared-infrastructure.md |

### 目的

単一のユニットについて、インフラストラクチャ、デプロイアーキテクチャ、モニタリング、
CI/CD パイプラインを設計します。amadeus-aws-platform-agent が主導し、
amadeus-devsecops-agent がインフラストラクチャセキュリティを確保し、
amadeus-compliance-agent がデータレジデンシーと規制上の制約をチェックします。

### 入力

- `<record>/construction/{unit-name}/nfr-design/` からの NFR 設計(存在する場合)
- `<record>/construction/{unit-name}/functional-design/` からの機能設計
  (存在する場合)
- `<record>/inception/application-design/` からのアプリケーション設計
- `<record>/construction/{unit-name}/nfr-requirements/` からの NFR 要件
  (存在する場合)

### 手順

1. **Load Personas** -- amadeus-aws-platform-agent(lead)のペルソナと知識をロード。
   サポートインプット用に amadeus-devsecops-agent(インフラストラクチャセキュリティ)
   と amadeus-compliance-agent(データレジデンシー、規制上の制約)のペルソナと知識を
   ロード。

2. **Read Prior Artifacts** -- コンテキストのためにすべての先行設計成果物を読む:
   NFR 設計、機能設計、アプリケーション設計、NFR 要件。

3. **Generate Infrastructure Questions** -- `[Answer]:` タグを使った文脈に適した
   質問ファイルを
   `<record>/construction/{unit-name}/infrastructure-design/infrastructure-design-questions.md`
   に作成する。フォーカス領域:
   - デプロイ戦略(コンテナ化、サーバーレス、ハイブリッド、マルチリージョン)
   - コンピュート/ストレージ/ネットワーキング(サイジング、トポロジー、レイテンシ
     要件)
   - モニタリングアプローチ(メトリクス、ロギング、トレーシング、アラート閾値)
   - CI/CD パイプライン(ビルドステージ、デプロイ戦略、ロールバック手順)
   - シークレット管理(vault、環境変数、ローテーションポリシー)
   - スケーリングポリシー(オートスケーリングトリガー、キャパシティ制限、コスト制約)

4. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従って回答を
   収集する。必須の曖昧性分析を実施する:
   - 曖昧な回答(「cloud-based」「auto-scale」「standard monitoring」)を特定
   - 回答間の矛盾をチェック
   - 成果物生成に必要な欠落した詳細をフラグ
   - 曖昧さが1つでも見つかった場合: フォローアップ質問を作成し、進行前に解決する

5. **Design Infrastructure** -- 4つの領域にわたってインフラストラクチャを設計する:
   - **Deployment Architecture**: コンピュートモデル(コンテナ、サーバーレス、VM)、
     ネットワーキングトポロジー、ストレージ戦略、環境レイアウト(dev/staging/prod)
   - **Infrastructure Services**: データベース(タイプ、サイジング、複製)、キャッシュ
     (戦略、エビクション)、メッセージキュー、検索サービス、CDN、DNS、ロード
     バランサー
   - **Monitoring & Observability**: メトリクス収集、ログ集約、分散トレーシング、
     アラートルール、ダッシュボード、SLI/SLO トラッキング
   - **CI/CD Pipeline**: ビルドステージ、テストステージ、デプロイステージ、環境
     プロモーション、ロールバック戦略、フィーチャーフラグ、アーティファクト管理

6. **Generate Artifacts** -- 以下を
   `<record>/construction/{unit-name}/infrastructure-design/` に生成する:
   - **deployment-architecture.md**: コンピュートリソース、ネットワーキング、
     ストレージ、環境定義、Infrastructure-as-Code アプローチ、リソースサイジング
   - **infrastructure-services.md**: データベース設計、キャッシング層、メッセージング
     インフラストラクチャ、外部サービス統合、サービスディスカバリ
   - **monitoring-design.md**: メトリクスと KPI、ログ戦略、トレーシング設定、
     アラート定義、ダッシュボード仕様、インシデントレスポンス
   - **cicd-pipeline.md**: パイプラインステージ、ビルド設定、テスト自動化統合、
     デプロイ戦略(ブルーグリーン、カナリア、ローリング)、ロールバック手順、
     CI/CD でのシークレット管理
   - **shared-infrastructure.md**(CONDITIONAL -- 複数のユニットがインフラストラクチャ
     リソースを共有する場合に生成): 共有データベース、共有キャッシュ、共有メッセージ
     キュー、共有ネットワーキング、ユニット横断サービスディスカバリ、リソースの
     所有権とアクセス境界

7. **Update State** -- `<record>/amadeus-state.md` を更新: {unit-name} の
   Infrastructure Design を `[x]` 完了としてマークし、"Current Status" を更新。

8. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                   | Description                                                               |
|----------------------------|---------------------------------------------------------------------------|
| deployment-architecture.md | コンピュート、ネットワーキング、ストレージ、環境定義、IaC アプローチ       |
| infrastructure-services.md | データベース、キャッシング、メッセージング、外部統合、サービスディスカバリ   |
| monitoring-design.md       | メトリクス、ログ、トレーシング、アラート、ダッシュボード、SLI/SLO トラッキング             |
| cicd-pipeline.md           | パイプラインステージ、ビルド設定、デプロイ戦略、ロールバック手順   |
| shared-infrastructure.md   | (CONDITIONAL) ユニット横断の共有リソース、所有権境界         |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記 -- Infrastructure Design の拡張

このステージは**5つの成果物ファイル**を生成します。これは、2〜3ファイルを持つ上流
リファレンスから拡張されています。これは SKILL.md(「Deliberate Deviations from
Reference」)に文書化された意図的な逸脱です。monitoring-design.md と cicd-pipeline.md
を専用の成果物として追加することで運用上の可視性が向上します。
shared-infrastructure.md は、複数のユニットがインフラストラクチャリソースを共有する
場合にのみ条件付きで生成されます。

---

## ステージ 3.5: Code Generation

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.5                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | ALWAYS (per-unit)                                                                                 |
| Condition         | 実行計画内のすべてのユニットに対して常に実行。                                             |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | amadeus-developer-agent                                                                                   |
| support_agents    | (none -- 集中した実装)                                                                  |
| mode              | subagent (Task tool subagent_type: amadeus-developer-agent)                                               |
| Inputs            | このユニットのすべての先行設計成果物                                                          |
| Outputs           | application code (workspace root) + `<record>/construction/{unit-name}/code-generation/` -- code-generation-plan.md, code-summary.md |

### 目的

単一のユニット・オブ・ワークについて、すべてのアプリケーションコード、テスト、設定を
生成します。これは、実行計画に関わらずすべてのユニットに対して常に実行される唯一の
ステージです。コードは workspace root に書き込まれ、`<record>/` には決して書き込まれ
ません。

### 重要ルール

- アプリケーションコードは workspace root に置き、`<record>/` には**決して**置かない
- ブラウンフィールド: ファイルをインプレースで変更する。`ClassName_modified.java` の
  ような複製を**決して**作成しない
- テスト自動化のために、インタラクティブな UI 要素に `data-testid` 属性を追加する

### 入力

- `<record>/construction/{unit-name}/functional-design/` からの機能設計
  (存在する場合)
- `<record>/construction/{unit-name}/nfr-requirements/` からの NFR 要件
  (存在する場合)
- `<record>/construction/{unit-name}/nfr-design/` からの NFR 設計(存在する場合)
- `<record>/construction/{unit-name}/infrastructure-design/` からのインフラストラクチャ
  設計(存在する場合)
- `<record>/inception/application-design/` からのアプリケーション設計
- `<record>/inception/units-generation/unit-of-work.md` からのユニット定義
- `<record>/inception/units-generation/unit-of-work-story-map.md` からのストーリーマップ

### 手順

このステージは**2部構成**です: 計画に続いて生成。

#### PART 1 -- 計画 (手順 1-3)

1. **Read All Unit Artifacts** -- 現在のユニットのすべての設計成果物(機能設計、
   NFR 要件、NFR 設計、インフラストラクチャ設計、アプリケーション設計、ユニット定義、
   ストーリーマップ)を読む。

2. **Create Code Generation Plan** -- 各実装ステップのチェックボックスを含む詳細な
   計画を
   `<record>/construction/{unit-name}/code-generation/code-generation-plan.md`
   に作成する。ストーリーからコードステップへのトレーサビリティを含める -- 各計画
   ステップを、それが実装するユーザーストーリーへマッピングする。

   **推奨される計画構造**(アーキテクチャが異なる順序を必要とする場合は適応する):

   ```
   Step 1:  Project structure setup (directories, config files, package.json/Cargo.toml/etc.)
   Step 2:  Data models / database schema / migrations
   Step 3:  Business logic layer (core domain logic, services)
   Step 4:  Business logic tests (unit tests for Step 3)
   Step 5:  API / endpoint layer (routes, controllers, handlers)
   Step 6:  API tests (unit + integration tests for Step 5)
   Step 7:  Repository / data access layer (queries, ORM config)
   Step 8:  Frontend components (if applicable -- UI components, pages, state)
   Step 9:  Frontend tests (component tests, interaction tests)
   Step 10: Configuration and environment setup (.env templates, build config)
   Step 11: Test configuration (vitest.config, jest.config, or equivalent)
   Step 12: Documentation (inline docs, API docs, README updates)
   ```

   このレイヤーごとのアプローチにより、依存対象より前に依存元が構築されることが保証
   されます(ビジネスロジックより前にデータモデル、API より前にビジネスロジック)。
   アーキテクチャが必要とする場合は逸脱する(例: イベント駆動システム、独立した
   スタックを持つマイクロサービス)。

   **テストファイルは計画に必須。** 計画には以下のステップを必ず含めなければならない:
   - ユニットテストファイル(コンポーネント/モジュールごとに1つ、主要な動作の
     カバレッジを伴う)
   - テスト設定(vitest.config、jest.config、または同等物)

   計画がテストファイルのステップを省略している場合、ユーザーに提示する前に追加
   しなければならない。テストは Build and Test へ先送りしない -- そのステージは検証と
   拡張を行うのであって、ゼロから作成するのではない。

   明確な実行順序とトレーサビリティのために、各計画ステップに連番を付ける(Step 1、
   Step 2 など)。

3. **Plan Approval** -- 計画のサマリーをユーザーに提示し、承認を求める:
   - "Approve Plan" -- コード生成へ進む
   - "Request Changes" -- 計画を修正する

#### PART 2 -- 生成 (手順 4-7)

4. **Generate Code** -- 委譲する前に、ユーザーに表示する:
   "Generating code for [N] plan steps. This may take several minutes
   depending on project complexity. I'll show a summary when complete."

   amadeus-developer-agent サブエージェント(subagent_type="amadeus-developer-agent")で
   Task ツールに委譲する。

   **サブエージェントに渡すコンテキスト:**
   - `agents/amadeus-developer-agent.md` からの lead agent のペルソナと
     `.claude/knowledge/amadeus-developer-agent/` からの知識(サブエージェントは会話
     履歴にアクセスできないためプロンプトに含める)
   - 現在のユニットのみの設計成果物(すべてのユニットではない)
   - 各 inception フェーズ成果物のファイルパス付き1〜2行サマリー(要件サマリー、
     ストーリーサマリー、アプリ設計サマリー)-- サブエージェントは完全なコンテンツが
     必要な場合に特定のファイルを Read できる
   - 承認済みの code-generation-plan.md(全文)
   - プロジェクトの workspace 詳細(amadeus-state.md からの言語、フレームワーク、規約)
   - 各計画ステップを順次実行し、完了したらチェックボックスをマークする指示

   **コンテキスト予算:** すべてのユニットではなく、現在のユニットの設計成果物のみを
   渡す。inception 成果物は全文を埋め込むのではなくファイルパス付きで要約する。
   サブエージェントは、workspace 内にすべてのコード、テストファイル、設定成果物を
   生成する。

5. **Generate Code Summary** -- サブエージェント完了後、以下を文書化する
   `<record>/construction/{unit-name}/code-generation/code-summary.md` を作成する:
   - 作成/変更されたファイル
   - 主要な実装上の決定
   - テストカバレッジサマリー
   - 計画からの逸脱

6. **Update State** -- `<record>/amadeus-state.md` を更新: {unit-name} の Code
   Generation を `[x]` 完了としてマークし、"Current Status" を更新。

7. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                  | Description                                                         |
|---------------------------|---------------------------------------------------------------------|
| code-generation-plan.md   | チェックボックス、ストーリートレーサビリティ、ステップシーケンスを伴う詳細計画  |
| code-summary.md           | 作成/変更されたファイル、決定、テストカバレッジ、計画からの逸脱   |
| (application code)        | workspace root に書き込まれるすべてのソースコード、テスト、設定        |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記

- **2部構成**: 計画フェーズ(手順 1-3)はユーザーインタラクションと計画承認を伴い
  インラインで実行される。生成フェーズ(手順 4-7)は Task ツールを介して
  amadeus-developer-agent サブエージェントに委譲される。これは、完全にインラインで
  実行される大半の Construction ステージとは異なる。
- **Developer-agent サブエージェント**: コード生成は
  `subagent_type="amadeus-developer-agent"`(Task ツール経由で委譲)を使用し、
  インライン実行ではない。これはサブエージェントを使用する唯一の Construction
  ステージである。サブエージェントはフルセッションツールセットを継承する
  (amadeus-developer-agent は `tools:` allowlist を宣言しない)ため、Read、Edit、
  Write、Glob、Grep、Bash、AskUserQuestion、および継承された MCP ツールに到達する。
- **コンテキスト予算**: 現在のユニットの設計成果物のみがサブエージェントに渡される。
  inception フェーズの成果物はファイルパス付きで1〜2行に要約されるため、サブ
  エージェントは必要なものを選択的に Read できる。
- **テストファイルの必須包含**: テストファイルはコード生成計画の一部でなければ
  ならない。ステージ 3.6(Build and Test)はテストを検証・拡張するが、ゼロから作成
  するのではない。
- **ブラウンフィールドの認識**: ブラウンフィールドプロジェクトでは、サブエージェントは
  複製を作成するのではなく既存ファイルをインプレースで変更する。

---

## ステージ 3.6: Build and Test

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.6                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | ALWAYS (すべてのユニット完了後)                                                                 |
| Condition         | すべてのユニットごとのステージ完了後に常に1回実行。                                      |
| Per-Unit          | No (すべてのユニットに対して1回実行)                                                                     |
| Lead Agent        | amadeus-quality-agent                                                                                     |
| support_agents    | amadeus-devsecops-agent                                                                                   |
| mode              | inline                                                                                            |
| Inputs            | 全ユニットにわたるすべてのコード生成出力                                                      |
| Outputs           | `<record>/construction/build-and-test/` -- build-instructions.md, unit-test-instructions.md, integration-test-instructions.md, performance-test-instructions.md, security-test-instructions.md, build-and-test-summary.md, test-results.md, および条件付きテスト指示ファイル |

### 目的

すべてのテストタイプにわたるテスト指示を生成し、その後 Bash を介して実際にビルドと
テストを実行します。このステージはすべてのユニットにわたって動作します -- ユニット
ごとでは**ありません**。amadeus-quality-agent が主導し、amadeus-devsecops-agent が
セキュリティテストの専門知識を提供します。

### 入力

- `<record>/construction/*/code-generation/code-summary.md` からの全ユニットにわたる
  コード生成出力
- パフォーマンスおよびセキュリティテストのニーズのための、ユニット横断の NFR 要件
  (存在する場合)

### 手順

1. **Load Personas** -- amadeus-quality-agent(lead)のペルソナと知識をロード。
   セキュリティテストのインプット用に amadeus-devsecops-agent のペルソナと知識を
   ロード。

2. **Analyze Testing Requirements** -- 全ユニットにわたるコード生成出力を読む。
   パフォーマンスおよびセキュリティテストのニーズを特定するために NFR 要件(存在する
   場合)をレビューする。必要なすべてのテストタイプをカタログ化する。

3. **Generate Build Instructions** --
   `<record>/construction/build-and-test/build-instructions.md` を作成する:
   - 依存関係のインストール手順
   - 環境セットアップ(環境変数、設定ファイル、ローカルサービス)
   - ビルドコマンド(コンパイル、バンドル、トランスパイル)
   - ビルド検証手順
   - 一般的なビルド問題のトラブルシューティング

4. **Generate Unit Test Instructions** --
   `<record>/construction/build-and-test/unit-test-instructions.md` を作成する:
   - テストフレームワークのセットアップと設定
   - ユニットテストの実行方法(コマンド、フラグ、フィルター)
   - 期待されるテストカバレッジ目標
   - モック/スタブのガイダンス
   - テストデータ管理

5. **Generate Integration Test Instructions** --
   `<record>/construction/build-and-test/integration-test-instructions.md` を作成する:
   - テスト環境の前提条件(データベース、サービス、キュー)
   - 統合テストの実行方法
   - ユニット横断のインタラクションテスト
   - 外部依存関係の扱い(スタブ、テストダブル、サンドボックス)
   - テストデータのセットアップとティアダウン

6. **Generate Performance Test Instructions**(CONDITIONAL)-- いずれかのユニットに
   NFR パフォーマンス要件が存在する場合、`performance-test-instructions.md` を作成する:
   - 負荷テストツールと設定
   - NFR 目標にマッピングされたパフォーマンステストシナリオ
   - ベースライン測定とベンチマーク
   - ストレステストとソークテストの手順
   - パフォーマンスリグレッションの検出

7. **Generate Security Test Instructions**(CONDITIONAL)-- いずれかのユニットに
   NFR セキュリティ要件が存在する場合、`security-test-instructions.md` を作成する:
   - セキュリティスキャンツール(SAST、DAST、依存関係監査)
   - 認証/認可テストシナリオ
   - 入力バリデーションとインジェクションテスト
   - コンプライアンス検証手順
   - 脆弱性評価手順

8. **Generate Additional Test Types**(CONDITIONAL)-- プロジェクトアーキテクチャに
   応じて該当する場合、具体的な名前のファイルを作成する:
   - **contract-test-instructions.md**: マイクロサービス API 向け -- コンシューマー
     ドリブンコントラクト、スキーマバリデーション、API 互換性
   - **e2e-test-instructions.md**: UI 駆動アプリケーション向け -- ブラウザ自動化、
     ユーザージャーニーテスト、クロスブラウザ検証
   - **accessibility-test-instructions.md**: ユーザー向けインターフェース向け --
     WCAG 準拠、スクリーンリーダーテスト、キーボードナビゲーション

   すべてのファイルは `<record>/construction/build-and-test/` に置く。

9. **Generate Build and Test Summary** --
   `<record>/construction/build-and-test/build-and-test-summary.md` を作成する:
   - 全体的なビルドステータスと前提条件
   - テストタイプインベントリ(どのテストタイプが生成されたか)
   - ユニットごとのカバレッジ期待値
   - 準備状況の評価(build-ready、test-ready、deployment-ready)
   - 既知の制限事項または未解決の項目

10. **Execute Build and Tests** -- 指示ファイルに文書化されたビルドおよびテスト
    コマンドを **Bash を介して**実行を試みる:

    a. **Build**: build-instructions.md のビルドコマンドを Bash 経由で実行する。
       出力をキャプチャする。
    b. **Unit tests**: unit-test-instructions.md のユニットテストコマンドを Bash 経由で
       実行する。合否カウントをキャプチャする。
    c. **Integration tests**(該当する場合): 統合テストコマンドを実行する。結果を
       キャプチャする。
    d. **Report results**: 以下を含めて
       `<record>/construction/build-and-test/test-results.md` を作成または更新する:
       - ビルドステータス(成功/失敗 + 出力)
       - テスト結果(合計、合格、失敗、スキップ)
       - 失敗の詳細(テスト名、アサーション、スタックトレース)
       - カバレッジレポート(テストフレームワークがサポートする場合)

    **失敗診断ループ(2回試行):** 失敗時、ビルドまたはテストが失敗した場合、問題の
    診断と修正を試みる:
    - エラー出力を読む
    - 失敗しているコードを特定する
    - 修正を適用する
    - 失敗したステップを再実行する
    - 2回試行しても修正できない場合、test-results.md に失敗をログし、承認ゲートで
      ユーザーに問題を提示する

    **成功時:** 実際の結果(指示だけでなく)で Build and Test Summary を更新する。

11. **Update State** -- `<record>/amadeus-state.md` を更新: Build and Test を `[x]`
    完了としてマークし、"Current Status" を更新。CONSTRUCTION フェーズを完了として
    マークする。

12. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                          | Description                                                     | Condition          |
|-----------------------------------|-----------------------------------------------------------------|--------------------|
| build-instructions.md             | 依存関係インストール、環境セットアップ、ビルドコマンド、トラブルシューティング  | Always             |
| unit-test-instructions.md         | テストフレームワークセットアップ、実行コマンド、カバレッジ目標、モック   | Always             |
| integration-test-instructions.md  | 前提条件、ユニット横断テスト、外部依存、データセットアップ    | Always             |
| performance-test-instructions.md  | 負荷テスト、NFR シナリオ、ベースライン、ストレス/ソークテスト       | NFR perf が存在する場合 |
| security-test-instructions.md     | SAST/DAST、認証テスト、インジェクションテスト、コンプライアンス          | NFR sec が存在する場合  |
| contract-test-instructions.md     | コンシューマードリブンコントラクト、スキーマバリデーション、API 互換        | マイクロサービスの場合   |
| e2e-test-instructions.md          | ブラウザ自動化、ユーザージャーニー、クロスブラウザ                | UI 駆動の場合       |
| accessibility-test-instructions.md| WCAG 準拠、スクリーンリーダー、キーボードナビゲーション                    | ユーザー向け UI の場合  |
| build-and-test-summary.md         | 全体ステータス、テストインベントリ、カバレッジ、準備状況評価  | Always             |
| test-results.md                   | 実際のビルド/テスト実行結果、合否、カバレッジ        | Always             |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記

- **実際の Bash 実行**: このステージはテスト指示を文書化するだけではなく --
  Bash を介して実際にビルドおよびテストコマンドを実行し、実際の結果をキャプチャする。
  これは、コードベースに対して実コマンドを実行する数少ないステージの1つである。
- **失敗診断ループ**: このステージは最大2回の試行で、失敗の自動診断と修正を試みる。
  2回試行しても修正が失敗した場合、失敗はログされ、承認ゲートでユーザーに表面化
  される。
- **条件付きテストタイプ**: パフォーマンステスト、セキュリティテスト、コントラクト
  テスト、E2E テスト、アクセシビリティテストは、関連する条件が満たされる場合(NFR 要件
  が存在する、マイクロサービスアーキテクチャ、UI 駆動アプリケーション、ユーザー向け
  インターフェース)にのみ生成される。
- **ユニット横断スコープ**: ユニットごとであるステージ 3.1-3.5 とは異なり、Build and
  Test は全ユニットが生成したすべてのコードにわたって1回実行される。個々のユニット
  ではなく、統合されたコードベースを検証する。
- **フェーズ完了**: このステージ(該当する場合は 3.7 とともに)は Construction フェーズ
  の終わりを示す。state ファイルが更新され、CONSTRUCTION が完了としてマークされる。

---

## ステージ 3.7: CI Pipeline

### メタデータ

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.7                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (CI がすでに存在し十分な場合はスキップ)                                           |
| Condition         | CI パイプラインの作成または大幅な変更が必要な場合に実行                               |
| Per-Unit          | No (すべてのユニットに対して1回実行)                                                                     |
| Lead Agent        | amadeus-pipeline-deploy-agent                                                                             |
| support_agents    | (none)                                                                                            |
| mode              | inline                                                                                            |
| Inputs            | ステージ 3.5 のコード生成出力、ステージ 3.6 のビルド/テスト結果                         |
| Outputs           | `<record>/construction/ci-pipeline/` -- ci-config.md, quality-gates.md, ci-pipeline-questions.md |

### 目的

品質ゲート、アーティファクト管理、ビルド/テスト自動化を伴う CI(継続的インテグレー
ション)パイプラインを設定します。amadeus-pipeline-deploy-agent が主導し、サポート
エージェントはいません。

### 入力

- `<record>/construction/build-and-test/` からのビルド/テスト結果
- `<record>/construction/infrastructure-design/` からのインフラストラクチャ設計
  (存在する場合)
- 既存の CI 設定のための workspace プロファイル

### 手順

1. **Load Agent Personas** -- amadeus-pipeline-deploy-agent のペルソナと知識をロード。

2. **Load Prior Context** -- ビルド/テスト結果、インフラストラクチャ設計(存在する
   場合)、および既存の CI 設定のための workspace プロファイルを読む。

3. **Generate Clarifying Questions** -- 以下の質問を含む
   `<record>/construction/ci-pipeline/ci-pipeline-questions.md` を作成する:
   - どの CI ツールが使われているか(CodePipeline、CodeBuild、GitHub Actions、
     Jenkins)?
   - ブランチ戦略は何か?
   - マージ前にどの品質ゲートが必要か?
   - どのアーティファクトリポジトリが使われているか(ECR、CodeArtifact、S3)?

   stage-protocol.md の質問フローに従う。

4. **Collect and Analyze Answers** -- CI の選択を既存のインフラストラクチャとチームの
   能力に照らして検証する。

5. **Generate Artifacts** -- CI パイプライン設定(buildspec.yml、ワークフロー YAML、
   または同等物)、品質ゲート定義、アーティファクトリポジトリ設定を作成する。

6. **Phase Boundary Verification** -- Construction-to-Operation 検証チェックを実行
   する:
   - アーキテクチャからコードからテストへの整合性
   - すべてのコードが設計にトレースできる
   - 受け入れ基準に対するテストカバレッジ
   - 結果を `<record>/verification/phase-check-construction.md` に書き込む

7. **Update State** -- `<record>/amadeus-state.md` で 3.7 CI Pipeline を `[x]` 完了
   としてマークする。

8. **Completion** -- 完了メッセージと承認ゲートを提示。

### 出力

| Artifact                  | Description                                              |
|---------------------------|----------------------------------------------------------|
| ci-config.md              | CI パイプライン設定(buildspec、ワークフロー YAML など) |
| quality-gates.md          | マージ/プロモーションのための品質ゲート定義             |
| ci-pipeline-questions.md  | 回答付きの明確化質問                        |

### 承認ゲート

厳密に2択: Approve / Request Changes。

### 注記

- **フェーズ境界検証**: これは Construction フェーズの最後のステージである。
  Construction-to-Operation のフェーズ境界検証チェック(stage-protocol-governance.md
  セクション 13 に従う)を実行し、アーキテクチャがコードにトレースし、コードがテストに
  トレースすることを検証する。結果は
  `<record>/verification/phase-check-construction.md` に書き込まれる。
- **条件付き実行**: このステージは、プロジェクトがすでに十分な CI パイプラインを
  持っている場合はスキップされる。Delivery Planning の実行計画が実行するかどうかを
  決定する。
- **ユニット後実行**: ステージ 3.6 と同様、このステージはユニットごとではなく、
  すべてのユニットごとの作業が完了した後に1回実行される。

---

## フェーズサマリー

Construction フェーズは、段階的な construction フローを通じて、Inception の設計を
動作するソフトウェアへと変換します:

**ユニットごとのステージ (3.1-3.5):**
- 3.1 Functional Design -- ビジネスロジック、ドメインモデル、ルール(architect 主導)
- 3.2 NFR Requirements -- パフォーマンス、セキュリティ、スケーラビリティ、信頼性、
  技術スタック(architect 主導)
- 3.3 NFR Design -- NFR カテゴリのための具体的なパターン(architect 主導)
- 3.4 Infrastructure Design -- デプロイ、サービス、モニタリング、CI/CD
  (aws-platform 主導)
- 3.5 Code Generation -- サブエージェントを介した2部構成の計画 + 生成
  (developer 主導)

**ユニット後のステージ (3.6-3.7):**
- 3.6 Build and Test -- 指示生成 + 失敗診断を伴う実際の Bash 実行(quality 主導)
- 3.7 CI Pipeline -- CI 設定 + フェーズ境界検証(pipeline-deploy 主導)

**主要な特性:**
- ステージ 3.1-3.4 は CONDITIONAL、3.5-3.6 は ALWAYS 実行、3.7 は CONDITIONAL
- すべての条件付きステージは Delivery Planning の実行計画に従う
- ユニットごとのループにより、次のユニットが始まる前に1つのユニットが完全に完了する
- NFR 成果物は、上流リファレンスと比較して拡張された粒度を使用する(要件に5ファイル、
  設計に5ファイル)
- Infrastructure Design は、専用のモニタリングおよび CI/CD ファイルを伴う5つの成果物に
  拡張される
- コード生成は、コンテキスト予算制御を伴う amadeus-developer-agent サブエージェントを
  使用する
- Build and Test は、実際のコマンド実行と自動化された失敗診断を実行する
- CI Pipeline は、Operation への移行前にフェーズ境界検証を含む

**上流リファレンスからの意図的な逸脱:**
- NFR Requirements: 5ファイル(リファレンスの2から拡張)
- NFR Design: logical-components.md を含む5ファイル(リファレンスの2から拡張)
- Infrastructure Design: monitoring-design.md と cicd-pipeline.md を含む5ファイル
  (リファレンスの2〜3から拡張)
- ステージ成果物との計画/質問ファイルの同一場所配置
