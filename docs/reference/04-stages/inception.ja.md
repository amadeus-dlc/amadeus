# Inception フェーズ -- ステージリファレンス (2.1--2.8)

> 言語: [English](inception.md) | **日本語**

## フェーズ概要

Inception フェーズは AI-DLC 方法論における5つのフェーズのうち3番目にあたる。Ideation フェーズのビジネス intent とスコープを、具体的な技術成果物へと変換する。すなわち、リバースエンジニアリングによるコードベース理解(ブラウンフィールドプロジェクト向け)、チームプラクティスと運用ルール、正式な要件、ユーザーストーリー、洗練されたモックアップ、アプリケーションアーキテクチャ、ユニット・オブ・ワークへの分解、そして Construction フェーズを統制するデリバリー計画である。

Inception はステージ 2.1 から 2.8(8ステージ)を実行し、Construction へ引き継ぐ前にステージ 2.8(Delivery Planning)でフェーズ境界の検証チェックを行って終結する。

> **パス規約。** 各ワークフローの成果物は、その **intent record dir** — `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(`<space>` は非デフォルトの space が使われていない限り `default`、`<YYMMDD>` はレコードが時系列でソートされるようにするコンパクトな UTC 日付プレフィックス、`<label>` はリクエストの本質を短い kebab-case で表したもの。同日の衝突には数値カウンタが付く)の下に置かれる。正式で衝突しない id は `intents.json` レジストリの行に記録された UUIDv7 であり、ディレクトリ名は人間が読めるラベルにすぎない。以下では `<record>/` はそのディレクトリの略記である。例えば `<record>/inception/requirements-analysis/requirements.md` は `amadeus/spaces/default/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` に展開される。(per-intent レイアウト導入前に作成されたプロジェクトはフラットツリーを使っていたが、エンジンが初回実行時に移行する。)

このフェーズはインラインとサブエージェントの実行モードが混在しており、ステージ 2.1 では2ステップのサブエージェント委譲(コードスキャンには amadeus-developer-agent、その後の合成には amadeus-architect-agent)、ステージ 2.2(Practices Discovery)では並列マルチエージェントディスパッチを含む。

**Inception フェーズの主要な特徴:**

- フェーズはサブエージェント委譲を用いる技術ディスカバリーステージ(2.1 Reverse Engineering)から始まり、続いて並列マルチエージェントディスパッチを用いる方法論ディスカバリーステージ(2.2 Practices Discovery)、その後6つのインライン分析・設計ステージが続く。
- ステージ 2.1 は2ステップのサブエージェントパターンを使う。amadeus-developer-agent がコードをスキャンし、その後 amadeus-architect-agent がスキャン結果を9つの構造化成果物へ合成する。ブラウンフィールドプロジェクトでは常時再実行ポリシーを持つ。
- ステージ 2.2 は、ブラウンフィールドでは証拠スキャンのために4つのエージェント(pipeline-deploy、quality、developer、devsecops)を並列でディスパッチし、その後インタビューと承認ゲートを実行する。承認時にはコンテンツが `<record>/inception/practices-discovery/` から space のメモリレイヤ — `amadeus/spaces/<space>/memory/team.md` と `amadeus/spaces/<space>/memory/project.md` — へと昇格される。この行をまたぐ昇格こそが、このステージを他のすべてのステージと構造的に区別する点である。
- ステージ 2.7 は `unit-of-work.md` を生成する。これは Construction フェーズにおける段階的な構築フローを駆動するユニットを定義する。
- ステージ 2.8 は、各ユニットに対してどの Construction ステージがどの順序で実行されるかを決定する実行計画を生成する。チームの Way of Working(ブランチ戦略)、Walking Skeleton の姿勢、Deployment の各セクションを得るために `amadeus/spaces/<space>/memory/team.md` を読み込む。
- ステージ 2.8 のフェーズ境界検証は、Requirements から Stories、Architecture への整合性を検証する。

**スコープ駆動のステージ組み込み:**

| スコープ         | 組み込まれるステージ                                            |
|------------------|----------------------------------------------------------------|
| enterprise       | 2.1--2.8 すべて                                               |
| feature          | 2.1--2.8 すべて                                               |
| mvp              | 2.1(ブラウンフィールドの場合), 2.2, 2.3, 2.4, 2.5(UIの場合), 2.6, 2.7, 2.8 |
| poc              | 2.1(ブラウンフィールドの場合), 2.3(最小限)                    |
| bugfix           | 2.1(常時 -- バグの特定), 2.3(最小限 -- バグの記述)            |
| chore            | なし(Inception は完全にスキップ)                              |
| refactor         | 2.1(常時 -- 現行コードの理解), 2.3(最小限)                    |
| infra            | 2.2, 2.3(インフラ要件)                                        |
| security-patch   | 2.1(脆弱性コンテキストの特定), 2.3(最小限)                     |
| workshop         | 2.1--2.8                                                       |

---

## ステージ概要テーブル

| Stage | 名称                   | 条件        | Lead Agent             | Support Agents                                       | Mode                             |
|-------|------------------------|-------------|------------------------|------------------------------------------------------|----------------------------------|
| 2.1   | Reverse Engineering    | CONDITIONAL | amadeus-developer-agent        | amadeus-architect-agent                                      | subagent (amadeus-developer-agent → amadeus-architect-agent, 2-step) |
| 2.2   | Practices Discovery    | CONDITIONAL | amadeus-pipeline-deploy-agent  | amadeus-quality-agent, amadeus-developer-agent, amadeus-devsecops-agent      | inline (ブラウンフィールドでは並列マルチ Task) |
| 2.3   | Requirements Analysis  | ALWAYS      | amadeus-product-agent          | --                                                   | inline                           |
| 2.4   | User Stories           | CONDITIONAL | amadeus-product-agent          | amadeus-design-agent                                         | inline                           |
| 2.5   | Refined Mockups        | CONDITIONAL | amadeus-design-agent           | amadeus-product-agent                                        | inline                           |
| 2.6   | Application Design     | CONDITIONAL | amadeus-architect-agent        | amadeus-aws-platform-agent, amadeus-design-agent               | inline                           |
| 2.7   | Units Generation       | ALWAYS      | amadeus-architect-agent        | amadeus-delivery-agent                                       | inline                           |
| 2.8   | Delivery Planning      | ALWAYS      | amadeus-delivery-agent         | amadeus-architect-agent                                      | inline                           |

---

## ステージ 2.1: Reverse Engineering

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.1                                                                    |
| Condition        | CONDITIONAL -- ブラウンフィールド検出時。鮮度のため常時再実行           |
| Lead Agent       | amadeus-developer-agent                                                        |
| Support Agents   | amadeus-architect-agent                                                        |
| Mode             | subagent(2ステップ: amadeus-developer-agent の後に amadeus-architect-agent)              |
| Completion Emoji | (stage-protocol.md の completion テンプレートを使用)                    |

### 目的

Reverse Engineering はブラウンフィールドプロジェクトの既存コードベースに対する包括的な分析を行う。2ステップのサブエージェント委譲パターンを使う。まず amadeus-developer-agent がコードベース全体をスキャンし、次に amadeus-architect-agent がスキャン結果を9つの構造化成果物へ合成する。これらの成果物は、後続のすべての Inception および Construction ステージが土台とする技術基盤を提供する。

**常時再実行ポリシー:** Reverse Engineering は、既存の成果物があってもブラウンフィールドプロジェクトでは常に再実行される。これにより成果物が古いスナップショットではなく、コードベースの現在の状態を反映することが保証される。

### 入力

- `<record>/amadeus-state.md`(プロジェクトタイプの確認)

### 手順

1. **条件チェック** -- `<record>/amadeus-state.md` を読んでプロジェクトタイプがブラウンフィールドであることを確認する。ブラウンフィールドでない場合はこのステージをスキップし、`amadeus-state.md` にスキップ理由を記録して更新する。

2. **Developer コードスキャン** -- Task ツールで amadeus-developer-agent サブエージェント(`subagent_type="amadeus-developer-agent"`)に委譲する。委譲プロンプトには `agents/amadeus-developer-agent.md` の amadeus-developer-agent ペルソナと `.claude/knowledge/amadeus-developer-agent/` の知識を含める。`amadeus-state.md` のワークスペース状態をコンテキストとして含める。

   developer は以下についてコードベース全体をスキャンする:
   - すべてのパッケージ、モジュール、およびその目的
   - ビルドシステム、設定、依存関係
   - 外部および内部 API(エンドポイント、契約、メソッド)
   - フレームワーク、ライブラリ、およびそのバージョン
   - テストディレクトリ、テストフレームワーク、カバレッジ設定
   - コード品質の指標(リンティング、CI/CD、ドキュメント)
   - 技術的負債のシグナル

   developer は `templates/re-artifacts.md` の Developer Code Scan テンプレートに従って構造化されたスキャン結果を返す。

3. **Architect 合成** -- Task ツールで amadeus-architect-agent サブエージェント(`subagent_type="amadeus-architect-agent"`)に委譲する。委譲プロンプトには `agents/amadeus-architect-agent.md` の amadeus-architect-agent ペルソナと `.claude/knowledge/amadeus-architect-agent/` の知識を含める。完全な developer スキャン結果をコンテキストとして渡す。`amadeus-state.md` のワークスペース状態を含める。

   architect はスキャン結果を9つの出力成果物へ合成する(下記の出力を参照)。

4. **状態更新** -- `<record>/amadeus-state.md` で Reverse Engineering を `[x]` 完了としてマークする。current stage と next stage を更新する。

5. **完了の提示と承認要求** -- 生成した9つの成果物すべての完了サマリーを表示する。標準の承認ゲート: Approve(Requirements Analysis へ進む)/ Request Changes。

### 出力

9つの成果物すべてを `<record>/inception/reverse-engineering/` に書き出す:

| #  | ファイル                         | 内容                                                        |
|----|----------------------------------|-------------------------------------------------------------|
| 1  | `business-overview.md`           | ビジネスドメイン、目的、主要な機能                          |
| 2  | `architecture.md`                | システムアーキテクチャ、パターン、コンポーネント間の関係(Mermaid 図付き)。ビジネストランザクションがコンポーネントをまたいでどのように実装されているかを描く Interaction Diagrams セクション(シーケンス図またはフロー図)を必ず含めること。 |
| 3  | `code-structure.md`              | パッケージ/モジュールの構成、ファイル分類、コードパターン   |
| 4  | `api-documentation.md`           | 外部および内部の API サーフェス、エンドポイント、契約       |
| 5  | `component-inventory.md`         | 責務と依存関係を含む完全なコンポーネントリスト              |
| 6  | `technology-stack.md`            | 言語、フレームワーク、ライブラリとそのバージョン            |
| 7  | `dependencies.md`                | 外部依存関係、内部のパッケージ間依存関係                    |
| 8  | `code-quality-assessment.md`     | テストカバレッジ、リンティング、CI/CD、ドキュメント品質、技術的負債 |
| 9  | `reverse-engineering-timestamp.md` | RE が実行された時点(日付、可能ならコミットハッシュ、分析のスコープ) |

### 承認ゲート

標準の2択ゲート: **Approve**(Requirements Analysis へ進む)/ **Request Changes**。

### 備考

- **常時再実行ポリシー:** このステージは既存の成果物があってもブラウンフィールドプロジェクトでは常に再実行される。これは上流リファレンスからの意図的な逸脱であり、SKILL.md の "Deliberate Deviations" セクションに文書化されている。
- **2ステップのサブエージェントパターン:** amadeus-developer-agent が生のコードスキャンを行い、その後 amadeus-architect-agent がスキャンを構造化成果物へ合成する。この分離により、スキャンが徹底され(developer の視点)、合成がアーキテクチャ的に的確になる(architect の視点)。
- bugfix および refactor スコープでは、既存コードの理解が不可欠なため、このステージは(グリーンフィールドに近いと思われる場合でも)常に実行される。
- security-patch スコープでは、脆弱性コンテキストの特定のためにこのステージが実行される。
- ここで生成される9つの成果物は、Requirements Analysis(2.3)、User Stories(2.4)、Application Design(2.6)、Units Generation(2.7)で消費される。
- `architecture.md` 成果物には、ビジネストランザクションがコンポーネントをまたいでどのように実装されているかをシーケンス図またはフロー図で示す Interaction Diagrams を含めなければならない。

---

## ステージ 2.2: Practices Discovery

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.2                                                                    |
| Condition        | CONDITIONAL -- EXECUTE スコープでは鮮度のため常時再実行                 |
| Lead Agent       | amadeus-pipeline-deploy-agent                                                  |
| Support Agents   | amadeus-quality-agent, amadeus-developer-agent, amadeus-devsecops-agent                        |
| Mode             | inline(ブラウンフィールドでは並列マルチ Task ディスパッチ)              |
| Completion Emoji | (stage-protocol.md の completion テンプレートを使用)                    |

### 目的

Practices Discovery は、AI-DLC において2軸の構成モデルの両方の行に書き込む唯一のステージである。チームのブランチ戦略、walking-skeleton の姿勢、テスト姿勢、デプロイ頻度、コードスタイルルールを、証拠から(ブラウンフィールド)、あるいは `org.md` のデフォルトを使った AskUserQuestion 経由で(グリーンフィールド)ディスカバーし、`<record>/inception/practices-discovery/` に提案のドラフトを作成する。そして承認ゲートで、承認されたコンテンツをチームが著者となるハーネス設定 — `amadeus/spaces/<space>/memory/team.md` と `amadeus/spaces/<space>/memory/project.md` — へと**昇格**する。承認ゲートこそが、この行をまたぐ書き込みを正当なものにする。これがなければ、フレームワークが自らのハーネス設定においてチームの言葉を勝手に作り上げてしまう。

### 入力

- `<record>/amadeus-state.md`(プロジェクトタイプ)
- ブラウンフィールドのみ: reverse-engineering の9つの成果物(business-overview、architecture、code-structure、api-documentation、component-inventory、technology-stack、dependencies、code-quality-assessment、reverse-engineering-timestamp)
- `amadeus/spaces/<space>/memory/org.md`(グリーンフィールドのデフォルト提案)
- `.claude/knowledge/amadeus-pipeline-deploy-agent/branching-strategies.md`(lead-agent の KB)

### 出力

4つの成果物を `<record>/inception/practices-discovery/` に書き出す:

- `team-practices.md` -- 記述的でチームの声によるプロース。`team.md` の見出しに対応する5つのセクション: Way of Working、Walking Skeleton、Testing Posture、Deployment、Code Style。
- `discovered-rules.md` -- 是正的でエージェント向け。2つのセクション: Mandated(`ALWAYS …` ルール)と Forbidden(`NEVER …` ルール)。
- `evidence.md` -- エージェントごとの発見サマリー。再実行のための鮮度トレイル。
- `practices-discovery-timestamp.md` -- 実行タイムスタンプ + コミットハッシュ。

承認時、コンテンツは以下へ昇格される:

- `amadeus/spaces/<space>/memory/team.md` -- `replaceSection` によるセクション置換(再実行はセクション内容を蓄積せず上書きする)。
- `amadeus/spaces/<space>/memory/project.md` -- `appendUnderHeading` による見出し下への追記(ルールは蓄積され、日付スタンプで区別される)。

### 手順

1. 条件チェック: `amadeus-state.md` を読み、グリーンフィールドかブラウンフィールドかを分類する。ブラウンフィールドは Step 2 を実行し、グリーンフィールドはスキップする。
2. **ディスカバー(ブラウンフィールドのみ)** -- コンダクターが単一のアシスタントメッセージで4つの並列 `Task` 呼び出しを発行する: amadeus-pipeline-deploy-agent(ブランチ戦略)、amadeus-quality-agent(テスト姿勢)、amadeus-developer-agent(コードパターン)、amadeus-devsecops-agent(CI/セキュリティ)。各エージェントは自身の KB を読み、証拠をスキャンし、発見を返す。コンダクターは進む前に4つの発見すべてを収集する。
3. **インタビュー(常時)** -- 証拠のギャップに対して AskUserQuestion を行う。ブラウンフィールド: ギャップのみを尋ねる。グリーンフィールド: `org.md` のデフォルトを提案回答テキストとして5つのプラクティス領域すべてを尋ねる。再実行では以前の `team.md` の内容から事前入力する。
4. コンソリデート -- 4つの成果物を書き出す。`PRACTICES_DISCOVERED` を発火する。
5. 承認ゲート -- AskUserQuestion が両方のドラフトを提示する。選択肢: Approve / Edit-then-Approve / Reject-and-rewrite-from-scratch。
6. 昇格(Approve 時)-- `amadeus/spaces/<space>/memory/team.md` の5つのプラクティスセクションをセクション置換する。`amadeus/spaces/<space>/memory/project.md` の `## Mandated` と `## Forbidden` の下に日付スタンプ付きでルールを追記する。アトミック性: まず `project.md` を書き、その後 `team.md` を書く。失敗時は `PRACTICES_OVERRIDE` を発火し、PRACTICES_AFFIRMED を記録せずに中断する。
7. `PRACTICES_AFFIRMED` を発火する。状態のチェックボックスを更新する。`Practices Affirmed Timestamp`(v7 状態テンプレートのフィールド、マイルストーン6)を更新する。

### 備考

- `.claude/tools/amadeus-lib.ts` の `replaceSection` ヘルパーは、team.md の行をまたぐ昇格をサポートするためにマイルストーン8で追加された(既存の `appendUnderHeading` は再実行をまたいで重複を蓄積する)。
- `org.md` と `team.md` は1組の Title Case 見出しセット(`## Way of Working`、`## Walking Skeleton`、`## Testing Posture`、`## Deployment`、`## Code Style`)を共有する。このステージは、対応する Title Case 見出しで `extractMarkdownSection` を使って `org.md` の各セクションを読み、`team.md` の同じ見出しをセクション置換する。

---

## ステージ 2.3: Requirements Analysis

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.3                                                                    |
| Condition        | ALWAYS -- 深度は複雑さに応じて調整                                     |
| Lead Agent       | amadeus-product-agent                                                          |
| Support Agents   | (なし)                                                                 |
| Mode             | inline                                                                 |
| Completion Emoji | :mag:                                                                  |

### 目的

Requirements Analysis は、ユーザーの intent とリバースエンジニアリングによるコードベース理解を、正式で構造化された要件へと変換する。リクエストの明確さ、タイプ、スコープ、複雑さを評価し、適切な深度を決定し、既知の事項を抽出し、6つの次元にわたる完全性分析を実行し、明確化のための質問を生成し、正式な要件文書を生成する。

このステージは常に実行されるが、プロジェクトの複雑さに基づいて深度を調整する。明確で狭いスコープには最小限、中程度のスコープには標準、重大な未知を含む大きなスコープには包括的な深度を使う。

### 入力

- ステージ 2.1 の Reverse Engineering 成果物(`<record>/inception/reverse-engineering/`)、ブラウンフィールドの場合
- intent の `audit/` シャードからのユーザーのプロジェクト記述

### 手順

1. **エージェントペルソナのロード** -- `agents/amadeus-product-agent.md` の amadeus-product-agent ペルソナと `.claude/knowledge/amadeus-product-agent/` の知識をロードする。

2. **事前コンテキストのロード** -- ブラウンフィールドの場合: `<record>/inception/reverse-engineering/` から RE 成果物を読む。intent の `audit/` シャードからユーザーのプロジェクト記述を読む。

3. **ユーザーリクエストの分析** -- リクエストを以下について評価する:
   - **Clarity(明確さ)**: リクエストがどれだけ明確に定義されているか
   - **Type(タイプ)**: 新機能、機能強化、リファクタリング、バグ修正、マイグレーション
   - **Scope(スコープ)**: 単一コンポーネント、マルチコンポーネント、システム全体
   - **Complexity(複雑さ)**: シンプル、標準、複雑

4. **深度の決定** -- 複雑さの評価に基づいて:
   - **Minimal(最小限)**: 明確なリクエスト、狭いスコープ、十分理解されたドメイン
   - **Standard(標準)**: 中程度のスコープ、いくつかの未知、複数のステークホルダー
   - **Comprehensive(包括的)**: 大きなスコープ、重大な未知、複雑なドメイン

5. **現在の要件の評価** -- ユーザーの入力から既知の事項を抽出・整理する: 明示的な機能要件、暗黙の非機能要件、制約と前提、ビジネスコンテキストとゴール。

6. **完全性分析** -- 6つの次元にわたるカバレッジを評価する:
   1. 機能要件 -- コアとなる振る舞い、機能、ユースケース
   2. 非機能要件 -- パフォーマンス、セキュリティ、スケーラビリティ、信頼性
   3. ユーザーシナリオ -- ユーザーワークフロー、エッジケース、エラーシナリオ
   4. ビジネスコンテキスト -- ゴール、成功指標、ステークホルダー、制約
   5. 技術コンテキスト -- 統合ポイント、プラットフォーム要件、技術的制約
   6. 品質特性 -- 保守性、テスト容易性、アクセシビリティ、ユーザビリティ

   各次元のギャップを特定する。

7. **明確化のための質問の生成** -- PROACTIVE: 要件が6つの次元すべてで例外的に明確かつ完全でない限り、常に明確化のための質問を生成する。`[Answer]:` タグ形式を使って `<record>/inception/requirements-analysis/requirements-analysis-questions.md` を作成する。A-E の選択肢を持つコンテキストに応じた質問を含める。すべての質問は最終選択肢として `X. Other (please specify)` で終わらなければならない。すべての `[Answer]:` タグは空欄のままにする。

   インタラクションモードの質問フローを提供する: Guide Me / Grill Me / Edit File / Chat。

8. **回答の収集と分析** -- 質問ファイルを読み、すべての `[Answer]:` タグが埋まっていることを確認する。空欄がある場合は、未回答の質問を AskUserQuestion 経由で提示し、回答を書き戻す。部分的な回答のまま進めてはならない。以下を実行する:
   - 必須の曖昧さ検出: すべての回答について曖昧な表現(「mix of」「not sure」「depends」「probably」「maybe」)をスキャンする
   - 回答間の矛盾チェック
   - 欠落した詳細の特定

9. **フォローアップ質問** -- 曖昧さ、あいまいさ、矛盾が1つでも見つかった場合、その具体的な問題を対象としたフォローアップ質問を作成する。進む前にすべての曖昧さを解消する。「疑わしいときは尋ねよ。」

10. **要件の生成** -- `<record>/inception/requirements-analysis/requirements.md` を作成し、以下を含める:
    - Intent 分析 -- ユーザーが達成しようとしていること(単なる機能ではなくゴール)
    - 機能要件 -- 機能領域またはドメインごとに整理
    - 非機能要件 -- パフォーマンス、セキュリティ、スケーラビリティの目標
    - 制約 -- 技術的、ビジネス的、組織的
    - 前提 -- 根拠とともに文書化
    - スコープ外 -- 明示的に除外される項目
    - オープンな質問 -- 後続ステージのための残りの不確実性

11. **状態更新** -- `<record>/amadeus-state.md` で Requirements Analysis を `[x]` 完了としてマークする。current と next stage を更新する。

12. **完了の提示と承認要求** -- :mag: 絵文字とレビューパスとともに完了メッセージを表示する。承認ゲートには2つのバリアントがある:

    **実行状態で User Stories が SKIP に設定されている場合:** 3択ゲート: Approve / Request Changes / Add User Stories(現在スキップされている User Stories ステージを組み込む)。「Add User Stories」が選択された場合、`amadeus-state.md` を更新して User Stories を実行待ちとしてマークする。

    **User Stories が SKIP に設定されていない場合:** 標準の2択ゲート: Approve / Request Changes。

### 出力

すべての成果物を `<record>/inception/requirements-analysis/` に書き出す:

| ファイル                             | 内容                                                    |
|--------------------------------------|---------------------------------------------------------|
| `requirements.md`                    | 正式な要件: intent 分析、機能/非機能要件、制約、前提、スコープ外、オープンな質問 |
| `requirements-analysis-questions.md` | `[Answer]:` タグ付きの明確化のための質問(入力成果物)  |

### 承認ゲート

条件付きゲート形式:

- **User Stories がスキップされる場合:** 3択ゲート -- **Approve** / **Request Changes** / **Add User Stories**
- **User Stories がスキップされない場合:** 標準の2択ゲート -- **Approve** / **Request Changes**

### 備考

- これはワークフローで最も詳細な質問と回答のステージである。必須の曖昧さ検出を強制し、部分的またはあいまいな回答のまま進めることはない。
- 深度は複雑さに応じてスケールする: bugfix/poc には最小限、feature には標準、enterprise には包括的。
- bugfix スコープでは、このステージが最小限の深度でバグの記述を捉える。
- infra スコープでは、このステージがインフラ要件を捉える。
- ここで生成される要件文書は、User Stories(2.4)、Refined Mockups(2.5)、Application Design(2.6)、Units Generation(2.7)、Delivery Planning(2.8)で消費される。

---

## ステージ 2.4: User Stories

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.4                                                                    |
| Condition        | CONDITIONAL -- ユーザー向け機能、複数のペルソナ、複雑なビジネスロジック、またはクロスチーム作業の場合に実行 |
| Lead Agent       | amadeus-product-agent                                                          |
| Support Agents   | amadeus-design-agent                                                           |
| Mode             | inline                                                                 |
| Completion Emoji | :books:                                                                |

### 目的

User Stories は、正式な要件を、各機能の「誰が、何を、なぜ」を定義するユーザー中心のストーリーへと翻訳する。このステージは2部構成に従う。PART 1 では明確化のための質問を伴うストーリープランを作成し、PART 2 では実際のストーリーとペルソナを生成する。プランとストーリーは、統合レビューのために完了ゲートで一緒に提示される。

amadeus-design-agent がユーザーエクスペリエンスに関する補助的な視点を提供する。これは上流リファレンスにはない意図的な追加であり、SKILL.md の "Deliberate Deviations" セクションに文書化されている。

### 入力

- `<record>/inception/requirements-analysis/requirements.md`
- ステージ 2.1 の RE 成果物(`<record>/inception/reverse-engineering/`)、ブラウンフィールドの場合

### 手順

1. **エージェントペルソナのロード** -- `agents/amadeus-product-agent.md` の amadeus-product-agent ペルソナと `.claude/knowledge/amadeus-product-agent/` の知識をロードする。ユーザーエクスペリエンスに関する補助的な視点のために、`agents/amadeus-design-agent.md` の amadeus-design-agent ペルソナと `.claude/knowledge/amadeus-design-agent/` の知識をロードする。

2. **User Stories が必要かの検証** -- このプロジェクトにユーザーストーリーが価値を加えるかを評価する:
   - **実行する条件**: ユーザー向け機能、複数のユーザーペルソナ、複雑なビジネスロジック、クロスチームの調整が必要
   - **スキップする条件**: 純粋なリファクタリング、孤立したバグ修正、インフラのみ、開発者ツール

   `<record>/inception/user-stories/user-stories-assessment.md` を作成し、以下を文書化する: 決定(Execute または Skip)、根拠、考慮した要因、主要な価値領域(実行する場合)または代替カバレッジ(スキップする場合)。

   スキップする場合は、`amadeus-state.md` にスキップ理由を記録して更新し、次のステージへ進む。

3. **事前コンテキストのロード** -- `<record>/inception/requirements-analysis/requirements.md` を読む。ブラウンフィールドの場合、`<record>/inception/reverse-engineering/` から関連する RE 成果物を読む。

**PART 1: プランニング**

4. **質問を伴うストーリープランの作成** -- `<record>/inception/user-stories/user-stories-questions.md` を作成し、以下を含める:
   - ペルソナ開発のアプローチ(ユーザーは誰か、そのゴールは何か)
   - INVEST 基準(Independent、Negotiable、Valuable、Estimable、Small、Testable)を用いたストーリー形式
   - MoSCoW 優先度(Must Have / Should Have / Could Have / Won't Have)を用いたストーリーの優先順位付け。MVP 境界は Delivery Planning で正式に決定される。ストーリー優先度はその決定に情報を与える。
   - 分解アプローチの選択肢(機能別、ペルソナ別、ワークフロー別、ドメイン領域別、またはエピック別)
   - ペルソナとストーリー粒度についてのユーザー入力のための、`[Answer]:` タグ形式を用いた埋め込み質問

5. **回答の収集** -- stage-protocol.md セクション3の質問フロー(インタラクションモードの選択を提供し、回答を収集し、ファイルに書き戻す)に従って回答を収集する。

6. **回答の分析** -- 必須の曖昧さ分析: すべての回答について曖昧な表現(「mix of」「not sure」「depends」「probably」)をスキャンする。矛盾をチェックする。欠落した詳細を特定する。曖昧さが1つでも見つかった場合はフォローアップ質問を作成する。

7. **プランの提示と生成** -- ストーリープランのサマリー(ペルソナ数、ストーリー数、分解アプローチ)をインラインで提示する。その後ただちに PART 2 へ進む。ユーザーは統合された出力(プラン + 生成されたストーリー)を完了ゲートでレビューし承認する。

   生成が完了する前にユーザーがフィードバックを差し挟んだ場合は、それを改訂リクエストとして扱い、生成を続ける前にプランを更新する。

**PART 2: 生成**

8. **プランの実行 -- ストーリーとペルソナの生成** -- 承認されたプランに基づいて、以下を生成する:

   `<record>/inception/user-stories/personas.md`:
   - ユーザーペルソナの定義(名前、役割、ゴール、ペインポイント、コンテキスト)
   - ペルソナの関係と優先度ランキング

   `<record>/inception/user-stories/stories.md`:
   - 標準形式のユーザーストーリー: "As a [persona], I want [goal], so that [benefit]"
   - 各ストーリーの受け入れ基準
   - ストーリー優先度(Must Have / Should Have / Could Have / Won't Have)
   - ストーリーの依存関係と関係
   - INVEST 準拠のノート

9. **状態更新** -- `<record>/amadeus-state.md` で User Stories を `[x]` 完了としてマークする。current と next stage を更新する。

10. **完了の提示と承認要求** -- :books: 絵文字、生成したペルソナとストーリーのサマリー、レビューパスとともに完了メッセージを表示する。標準の2択承認ゲート: Approve(次のステージへ進む)/ Request Changes。

### 出力

すべての成果物を `<record>/inception/user-stories/` に書き出す:

| ファイル                       | 内容                                                         |
|--------------------------------|--------------------------------------------------------------|
| `stories.md`                   | 受け入れ基準、優先度、依存関係、INVEST ノート付きのユーザーストーリー |
| `personas.md`                  | ユーザーペルソナの定義、関係、優先度ランキング               |
| `user-stories-assessment.md`   | 根拠と考慮した要因を伴う Execute/skip 決定                    |
| `user-stories-questions.md`    | `[Answer]:` タグを用いた明確化のための質問を伴うストーリープラン(入力成果物) |

### 承認ゲート

標準の2択ゲート: **Approve**(次のステージへ進む)/ **Request Changes**。

### 備考

- スキップ条件: 純粋なリファクタリング、孤立したバグ修正、インフラのみ、開発者ツール。
- 2部構成(プランの後に生成)により、ストーリーが書かれる前にユーザーがストーリー分解アプローチに影響を与えることができる。
- ユーザーストーリーの優先度(MoSCoW)は MVP 境界に情報を与えるが、それを決定するわけではない。正式な MVP 境界は Delivery Planning(ステージ 2.8)で設定される。
- `user-stories-assessment.md` 成果物は、ステージがスキップされる場合でも、根拠を文書化するために常に生成される。
- ここで生成されるストーリーは、Refined Mockups(2.5)、Application Design(2.6)、Units Generation(2.7)、Delivery Planning(2.8)で消費される。
- amadeus-design-agent のサポートは UX を踏まえた開発のための意図的な追加であり、SKILL.md の Deliberate Deviations セクションに記載されている。

---

## ステージ 2.5: Refined Mockups & UX Design

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.5                                                                    |
| Condition        | CONDITIONAL -- 非 UI、API のみ、またはインフラのみの取り組みではスキップ |
| Lead Agent       | amadeus-design-agent                                                           |
| Support Agents   | amadeus-product-agent(ストーリーに対して検証)                              |
| Mode             | inline                                                                 |
| Completion Emoji | :art:                                                                  |

### 目的

Refined Mockups は、Ideation ステージ 1.6 のラフなコンセプトワイヤーフレームを、正式な要件とユーザーストーリーを踏まえた中〜高忠実度のモックアップへと進化させる。詳細なインタラクション仕様、デザインシステムのマッピング、レスポンシブ挙動の定義、アクセシビリティ準拠のチェックリストを生成する。

非 UI の取り組み(API のみ、バックエンド)では、このステージはインタラクション図を API 開発者エクスペリエンス仕様へと洗練する。

このステージは、ステージ 1.6(Rough Mockups)もスキップされた場合、通常スキップされる。

### 入力

- ステージ 1.6 のラフモックアップ(`<record>/ideation/rough-mockups/`)、存在する場合
- ステージ 2.4 のユーザーストーリー(`<record>/inception/user-stories/`)
- ステージ 2.3 の要件(`<record>/inception/requirements-analysis/`)

### 手順

1. **エージェントペルソナのロード** -- `agents/amadeus-design-agent.md` の amadeus-design-agent ペルソナと `.claude/knowledge/amadeus-design-agent/` の知識をロードする。

2. **事前コンテキストのロード** -- `<record>/ideation/rough-mockups/` からラフモックアップを読む(存在する場合)。`<record>/inception/user-stories/` からユーザーストーリーを読む。`<record>/inception/requirements-analysis/` から要件を読む。

3. **明確化のための質問の生成** -- `<record>/inception/refined-mockups/refined-mockups-questions.md` を作成し、以下をカバーする質問を含める:
   - 各ユーザーストーリーを UI でどのように表現すべきか
   - 必要なインタラクションパターン(モーダル、インライン編集、ウィザード、プログレッシブディスクロージャー)
   - 各画面が扱わなければならない状態(ローディング、空、エラー、成功、部分的)
   - 既存のデザインシステム / コンポーネントライブラリとの整合
   - アクセシビリティ要件(WCAG レベル)
   - 必要なレスポンシブブレークポイント
   - API の場合: 開発者エクスペリエンス要件

   stage-protocol.md の質問フローに従う。

4. **回答の収集と分析** -- 一貫性のために、デザイン決定をユーザーストーリーと要件に対して検証する。

5. **成果物の生成** -- 中〜高忠実度のモックアップ(ユーザーストーリー/画面ごと)、インタラクション仕様文書、デザインシステムのマッピング、レスポンシブ挙動仕様、アクセシビリティ準拠チェックリストを作成する。非 UI の取り組みでは、API 開発者エクスペリエンス仕様を作成する。

6. **状態更新** -- `<record>/amadeus-state.md` で 2.5 Refined Mockups を `[x]` 完了としてマークする。

7. **完了の提示と承認要求** -- :art: 絵文字とともに完了メッセージを表示する。標準の承認ゲート(Approve / Request Changes)。

### 出力

すべての成果物を `<record>/inception/refined-mockups/` に書き出す:

| ファイル                        | 内容                                                        |
|---------------------------------|-------------------------------------------------------------|
| `mockups.md`                    | ユーザーストーリー/画面ごとの中〜高忠実度モックアップ       |
| `interaction-spec.md`           | インタラクションパターン、状態管理、トランジション          |
| `design-system-mapping.md`      | デザインシステム / コンポーネントライブラリへのコンポーネントマッピング |
| `accessibility-checklist.md`    | WCAG 準拠チェックリストと要件                                |
| `refined-mockups-questions.md`  | `[Answer]:` タグ付きの明確化のための質問(入力成果物)      |

### 承認ゲート

標準の2択ゲート: **Approve** / **Request Changes**。

### 備考

- スキップ条件: 非 UI、API のみ、またはインフラのみの取り組み。また、ステージ 1.6(Rough Mockups)がスキップされた場合も通常スキップされる。
- mvp スコープでは、このステージはプロジェクトに UI がある場合のみ実行される。
- ここで生成されるモックアップは、Application Design(2.6)へ、そして最終的には UI コンポーネントのために Construction の Code Generation(3.5)へと供給される。
- アクセシビリティチェックリストは、Build and Test(3.6)に供給されるテスト可能な基準を提供する。

---

## ステージ 2.6: Application Design

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.6                                                                    |
| Condition        | CONDITIONAL -- 新しいコンポーネントやサービスが必要な場合に実行。既存コンポーネントの変更のみの場合はスキップ |
| Lead Agent       | amadeus-architect-agent                                                        |
| Support Agents   | amadeus-aws-platform-agent, amadeus-design-agent                                |
| Mode             | inline                                                                 |
| Completion Emoji | :building_construction:                                                |

### 目的

Application Design は、プロジェクトのシステムアーキテクチャを定義する: コンポーネント境界、インターフェース、サービス定義、通信パターン、依存関係、そしてアーキテクチャ決定記録(ADR)。要件とユーザーストーリーを、Construction を導く具体的な技術設計へと翻訳する。

amadeus-aws-platform-agent が AWS サービスマッピングに関する補助的な視点を提供する。amadeus-design-agent のサポートも UX を踏まえたアーキテクチャのために SKILL.md の Deliberate Deviations セクションに記載されている。

`decisions.md` 成果物(ADR)は上流リファレンスにはない意図的な追加であり、SKILL.md の "Deliberate Deviations" セクションに文書化されている。

### 入力

- `<record>/inception/requirements-analysis/requirements.md`
- `<record>/inception/user-stories/stories.md`(生成された場合)
- ステージ 2.1 の RE 成果物(特に `architecture.md`、`component-inventory.md`、`dependencies.md`)、ブラウンフィールドの場合

### 手順

1. **エージェントペルソナのロード** -- `agents/amadeus-architect-agent.md` の amadeus-architect-agent ペルソナと `.claude/knowledge/amadeus-architect-agent/` の知識をロードする。AWS サービスマッピングのために、`agents/amadeus-aws-platform-agent.md` の amadeus-aws-platform-agent ペルソナと `.claude/knowledge/amadeus-aws-platform-agent/` の知識をロードする。

2. **事前コンテキストのロード** -- 要件、ユーザーストーリー(生成された場合)、RE 成果物(ブラウンフィールドの場合、特に architecture.md、component-inventory.md、dependencies.md)を読む。スコープコンテキストは `<record>/amadeus-state.md` から得る。

3. **質問を伴う設計プランの作成** -- `<record>/inception/application-design/application-design-questions.md` を作成し、`[Answer]:` タグ形式を用いて以下をカバーするコンテキストに応じた質問を含める:
   - コンポーネント境界の決定
   - アーキテクチャスタイルの選好(まだ決定していない場合)
   - サービス通信パターン(同期 vs 非同期、REST vs gRPC vs イベント)
   - データの所有権とストレージ戦略
   - 既存コンポーネントとの統合アプローチ(ブラウンフィールド)
   - UI コンポーネント構造(ユーザー向けの場合、UX デザイナーの視点を踏まえて)

4. **回答の収集と分析** -- stage-protocol.md セクション3の質問フローに従って回答を収集する。必須の曖昧さ分析: 曖昧な表現、矛盾、欠落した詳細をスキャンする。曖昧さが1つでも見つかった場合はフォローアップ質問を作成する。進む前にすべての曖昧さを解消する。

5. **設計成果物の生成** -- 5つの設計成果物を作成する(下記の出力を参照)。

6. **状態更新** -- `<record>/amadeus-state.md` で Application Design を `[x]` 完了としてマークする。current と next stage を更新する。

7. **完了の提示と承認要求** -- :building_construction: 絵文字、設計成果物のサマリー、強調された主要なアーキテクチャ決定、レビューパスとともに完了メッセージを表示する。3択承認ゲート: Approve / Request Changes / Add Units Generation(実行計画でスキップされた場合)。

### 出力

5つの成果物すべてを `<record>/inception/application-design/` に書き出す:

| ファイル                          | 内容                                                      |
|-----------------------------------|-----------------------------------------------------------|
| `components.md`                   | コンポーネント名、目的、責務、インターフェース、境界、所有権 |
| `component-methods.md`            | 各コンポーネントの公開インターフェースのメソッドシグネチャ、入出力型、エラーハンドリングアプローチ(詳細なビジネスルールは Functional Design に属する) |
| `services.md`                     | サービス定義、責務、オーケストレーションパターン(コレオグラフィ vs オーケストレーション)、通信契約、ライフサイクルとスケーリング特性 |
| `component-dependency.md`         | 依存関係マトリクス、通信パターン(同期/非同期/イベント駆動)、コンポーネント間のデータフロー、共有リソースの特定 |
| `decisions.md`                    | Context、Decision、Consequences、Alternatives Considered を伴うアーキテクチャ決定記録(ADR)。トレードオフ分析。可逆性の評価 |

さらに、入力として質問ファイルが作成される:

| ファイル                                  | 内容                                            |
|-------------------------------------------|-------------------------------------------------|
| `application-design-questions.md`         | `[Answer]:` タグ付きの設計質問                  |

### 承認ゲート

特別な3択ゲート:

- **Approve** -- 次のステージへ進む
- **Request Changes** -- 改訂フィードバックを提供する
- **Add Units Generation** -- 現在スキップされている Units Generation ステージを組み込む(実行計画でスキップされた場合)

### 備考

- スキップ条件: 変更が既存コンポーネントの修正のみであり、新しいコンポーネントやサービスが不要な場合。
- `decisions.md` 成果物(ADR)は上流リファレンスからの意図的な逸脱である。各 ADR は Context、Decision、Consequences、Alternatives Considered に加え、トレードオフ分析と可逆性の評価を含む。
- ここで生成される設計成果物は、Units Generation(2.7)の主要な入力であり、Construction ステージ(Functional Design 3.1、Code Generation 3.5)に直接情報を与える。
- ブラウンフィールドプロジェクトでは、設計は RE 成果物に文書化された既存コンポーネントとの統合を考慮しなければならない。

---

## ステージ 2.7: Units Generation

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.7                                                                    |
| Condition        | ALWAYS -- ステージ 2.8 が Bolt シーケンス化のために消費する依存関係 DAG を生成する。コンパイルされたスコープグリッドでは 2.8 と一緒に扱われる |
| Lead Agent       | amadeus-architect-agent                                                        |
| Support Agents   | amadeus-delivery-agent                                                         |
| Mode             | inline                                                                 |
| Completion Emoji | :wrench:                                                               |

### 目的

Units Generation は、アプリケーション設計を、Construction フェーズにおける段階的な構築フローを駆動する個別の Unit of Work へと分解する。各 Unit は、システムの独立して実装可能な部分(サービス、モジュール、またはデプロイ可能なコンポーネント)を表す。このステージは、Construction が何を構築するかを決定するために使う `unit-of-work.md` ファイル、ステージ 2.8 が Bolt シーケンス化のために消費する依存関係 DAG(`unit-of-work-dependency.md`)、そしてすべてのユーザーストーリーが Unit に割り当てられることを保証するストーリーマップを生成する。

**ステージ 2.7 は依存関係 DAG(トポロジー)を生成する。ステージ 2.8 はその中を通る経済的な経路(Bolt シーケンス)を選ぶ。** 2.7 は実装順序を推奨したり、クリティカルパスを特定したりしてはならない — それらは 2.8 の経済的シーケンス化の決定である。

これは Inception の設計作業と Construction の実装作業をつなぐ重要なブリッジステージである。ここで生成される Unit の定義、依存関係、ストーリーマッピングは、Construction フェーズの実行方法を直接制御する。

このステージは2部構成に従う。PART 1 では明確化のための質問を伴う分解プランを作成しプラン承認を得て、PART 2 では実際の Unit 成果物を生成する。

### 入力

- ステージ 2.6 のすべての設計成果物(`<record>/inception/application-design/`: components.md、component-methods.md、services.md、component-dependency.md、decisions.md)
- `<record>/inception/requirements-analysis/requirements.md`
- `<record>/inception/user-stories/stories.md`(生成された場合)

### 手順

**PART 1: プランニング**

1. **エージェントペルソナのロード** -- `agents/amadeus-architect-agent.md` の amadeus-architect-agent ペルソナと `.claude/knowledge/amadeus-architect-agent/` の知識をロードする。実現可能性の検証と優先順位付けのために、`agents/amadeus-delivery-agent.md` の amadeus-delivery-agent ペルソナと `.claude/knowledge/amadeus-delivery-agent/` の知識をロードする。

2. **事前コンテキストのロード** -- `<record>/inception/application-design/` からすべての成果物(5ファイルすべて)を読む。要件を読む。ユーザーストーリー(生成された場合)を読む。スコープコンテキストは `<record>/amadeus-state.md` から得る。

3. **質問を伴う分解プランの作成** -- `<record>/inception/units-generation/units-generation-questions.md` を作成し、`[Answer]:` タグ形式を用いて以下をカバーする質問を含める:
   - Unit 境界戦略(サービス別、機能別、ドメイン別、デプロイターゲット別)
   - Unit 粒度の選好(粗粒度 vs 細粒度)
   - 依存関係の順序付けの選好(厳密なトポロジカルのみ、または独立した Unit 間の並列性を許可)
   - Unit 間の統合ポイントと契約(API、共有データ、イベント)
   - デプロイモデル(モノリシックデプロイ、独立デプロイ、ハイブリッド)

   注意: 実装順序の優先度(value-first、risk-first、walking-skeleton-first)については尋ねてはならない。それらはステージ 2.8 Delivery Planning に属する経済的シーケンス化の決定である。

4. **回答の収集と分析** -- stage-protocol.md セクション3の質問フローに従って回答を収集する。必須の曖昧さ分析: 曖昧な表現、矛盾、欠落した詳細をスキャンする。曖昧さが1つでも見つかった場合はフォローアップ質問を作成する。進む前にすべての曖昧さを解消する。

5. **プラン承認の取得** -- AskUserQuestion 経由で分解プランをユーザーに提示する: アプローチ(Unit 境界戦略、推定 Unit 数、依存関係構造)を要約する。選択肢: Approve Plan / Revise Plan。

**PART 2: 生成**

6. **プランの実行 -- Unit 成果物の生成** -- 承認されたプランに基づいて、3つの出力成果物を生成する(下記の出力を参照)。

7. **状態更新** -- `<record>/amadeus-state.md` で Units Generation を `[x]` 完了としてマークする。current と next stage を更新する。Construction フェーズの段階的構築フローのために Unit リストを記録する。

8. **完了の提示と承認要求** -- :wrench: 絵文字、定義した Unit、マッピングした依存関係、割り当てたストーリーのサマリー、レビューパスとともに完了メッセージを表示する。標準の2択承認ゲート: Approve(Construction フェーズへ進む)/ Request Changes。

### 出力

3つの成果物すべてを `<record>/inception/units-generation/` に書き出す:

| ファイル                        | 内容                                                        |
|---------------------------------|-------------------------------------------------------------|
| `unit-of-work.md`               | Unit 定義(名前、記述、境界)、責務、Unit ごとのデプロイモデル(standalone/shared/embedded)、相対的な複雑さの見積もり(S/M/L/XL)、実装ノートと制約 |
| `unit-of-work-dependency.md`    | Unit 間の依存関係 DAG(有向エッジ、サイクルなし)、統合ポイント(API/共有データ/イベント)、並列開発の機会(相互に依存しない Unit の集合)。トポロジーのみ — 経済的な経路選択(推奨順序、クリティカルパス)は 2.8 の仕事 |
| `unit-of-work-story-map.md`     | 各ユーザーストーリーを実装する Unit へのマッピング、複数の Unit にまたがる横断的ストーリー、各 Unit 内でのストーリー実装順序、カバレッジ検証(すべてのストーリーが割り当てられ、すべての Unit にストーリーがある) |

さらに、入力として質問ファイルが作成される:

| ファイル                              | 内容                                              |
|---------------------------------------|---------------------------------------------------|
| `units-generation-questions.md`       | `[Answer]:` タグ付きの分解質問                    |

### 承認ゲート

標準の2択ゲート: **Approve**(Construction フェーズへ進む)/ **Request Changes**。

### 備考

- **このステージの出力が Construction を駆動する。** `unit-of-work.md` ファイルは、Construction フェーズがその Unit ごとのループで反復する Unit を定義する。各 Unit は、次の Unit が始まる前に、該当する Construction ステージ(Functional Design、NFR Requirements、NFR Design、Infrastructure Design、Code Generation)を通過する。
- **2.7 はスコープ内にあるとき ALWAYS。** コンパイルされたスコープグリッドでは、2.7 と 2.8 は一緒に扱われる(スコープごとに両方 EXECUTE または両方 SKIP)。このステージには単一ユニットのスキップ条件はない — 単一 Unit のフローでも自明な DAG を生成する。
- 2部構成(プランの後に生成)により、Unit が定義される前にユーザーが分解戦略を承認できる。Step 5 には最終的な完了ゲートとは別の中間承認ゲート(Approve Plan / Revise Plan)がある。
- 依存関係 DAG は 2.8 の経済的な Bolt シーケンス化に供給される。2.8 はリスク、価値、学習で重み付けされた DAG 内の経路を選ぶ。
- ストーリーマップはトレーサビリティを提供する: すべてのユーザーストーリーは少なくとも1つの Unit に割り当てられなければならず、すべての Unit は少なくとも1つのストーリーを持たなければならない。
- amadeus-delivery-agent は実現可能性の検証と優先順位付けの入力を提供し、分解がデリバリーの視点から実践的であることを保証する。

---

## ステージ 2.8: Delivery Planning

### メタデータ

| フィールド       | 値                                                                     |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.8                                                                    |
| Condition        | ALWAYS -- Inception フェーズの総仕上げステージ                          |
| Lead Agent       | amadeus-delivery-agent                                                         |
| Support Agents   | amadeus-architect-agent(ビルド順序をアーキテクチャ依存関係に対して検証) |
| Mode             | inline                                                                 |
| Completion Emoji | :calendar:                                                             |

### 目的

Delivery Planning は Inception フェーズの総仕上げである。Bolt シーケンス — ステージ 2.7 が生成した Unit of Work が Construction を通じて実行される順序 — を計画する。ステージ 2.7 が分析的(依存関係 DAG)であるのに対し、ステージ 2.8 は経済的である: リスク、価値、チームキャパシティ、学習で重み付けされた DAG 内の経路を選ぶ。

`stage-protocol.md` の正式な Glossary によれば、**Bolt** とは「Construction 内のデプロイ可能な作業単位 — ステージ 3.1–3.5 を1回通過するもの」である。Bolt は1つ以上の Unit of Work に対する Construction の1回のパスであり、MMF やスプリントとは異なる。(ステージ 3.6 build-and-test と 3.7 ci-pipeline は Bolt ごとではなく、すべての Bolt にわたって最後に1回実行される。)注: AI-DLC v1 の方法論では Bolt は sprint 相当のタイムボックス(Unit of Work が複数の Bolt にまたがる)を指すが、本実装では Bolt を1つ以上の Unit を包む deployable slice の意味に意図的に転用している。

経済的な価値は DAG から導出できない — AI エージェントはトポロジカルソートはできるが、どの Bolt が市場の仮説を最速で検証するか、あるいはコミットメントが積み重なる前にどれが最も恐ろしい未知を明るみに出すかは決められない。それはこのステージで捉えられる人間の価値判断である。

このステージはまた、Construction へ移行する前にすべての Inception 成果物の整合性を検証するフェーズ境界検証チェックも実行する。

**重要な区別:** このステージは Bolt シーケンス化を計画する。どの AI-DLC ステージをどの深度で実行するかは決定しない — それは `/amadeus` スキルのスコープ選択が扱う。

### 入力

すべての Inception フェーズ成果物:

- ステージ 2.3 の要件(`<record>/inception/requirements-analysis/`)
- ステージ 2.4 のユーザーストーリー(`<record>/inception/user-stories/`)
- ステージ 2.6 のアプリケーション設計(`<record>/inception/application-design/`)
- ステージ 2.7 の Unit(`<record>/inception/units-generation/`)
- ステージ 1.5 のチーム編成(`<record>/ideation/team-formation/`)、存在する場合

### 手順

1. **エージェントペルソナのロード** -- `agents/amadeus-delivery-agent.md` の amadeus-delivery-agent ペルソナと `.claude/knowledge/amadeus-delivery-agent/` の知識をロードする。ビルド順序の検証のために amadeus-architect-agent をロードする。

2. **事前コンテキストのロード** -- すべての Inception フェーズ成果物を読む: 要件、ユーザーストーリー、アプリケーション設計、Unit、チーム編成(存在する場合)。

3. **明確化のための質問の生成** -- `<record>/inception/delivery-planning/delivery-planning-questions.md` を作成し、以下をカバーする質問を含める:
   - シーケンス化のヒューリスティック: risk-first、value-first、walking-skeleton-first、またはハイブリッド
   - 使用する場合の WSJF(Weighted Shortest Job First)スコアリングモデルと重み付け
   - 最初の Bolt: walking skeleton(Cockburn)、またはスケール前にアプローチを証明する信頼構築スライス
   - Unit of Work の Bolt へのバンドリング
   - 各 Bolt の Definition of Done
   - Bolt ごとの信頼仮説 — それを出荷することで何が証明されるか
   - Mob-to-Bolt 割り当て(利用可能な場合は 1.5 のチームを参照。実行されなかった場合は AI のみ)
   - 特定の Bolt をゲートする外部依存関係(API、データ、承認)
   - 最も早く取り組むべき主要なリスク項目

   stage-protocol.md の質問フローに従う。

4. **回答の収集と分析** -- 選ばれた Bolt シーケンスが 2.7 の依存関係 DAG を尊重していることを検証する(amadeus-architect-agent の入力を用いて)。トポロジカル順序からの逸脱があれば、それを rationale 成果物で正当化できるようフラグを立てる。

5. **成果物の生成** -- `<record>/inception/delivery-planning/` に4つの成果物を作成する:
   - `bolt-plan.md` — Bolt の順序付けられたシーケンス。Bolt ごとの Unit of Work、walking-skeleton マーカー、Definition of Done、信頼仮説、期待されるデモ。
   - `team-allocation.md` — Bolt-to-mob 割り当て。チーム数 > 1 のときの Program Board アナログ。
   - `risk-and-sequencing-rationale.md` — Bolt 順序の背後にある理由: WSJF スコア、risk-first の論拠、walking-skeleton-first の論拠、または value-first の論拠。
   - `external-dependency-map.md` — 消費する Bolt にマッピングされたゲート項目(完全に AI 内包の場合は軽量または空)。

6. **フェーズ境界検証** -- Inception-to-Construction の検証チェックを実行する:
   - Requirements から Stories、Architecture への整合性
   - すべてのストーリーが要件までトレースできる
   - アーキテクチャがすべてのストーリーをカバーする
   - 結果を `<record>/verification/phase-check-inception.md` に書き出す

7. **状態更新** -- `<record>/amadeus-state.md` で 2.8 Delivery Planning を `[x]` 完了としてマークする。Lifecycle Phase を CONSTRUCTION に更新する。

8. **完了の提示と承認要求** -- :calendar: 絵文字とともに完了メッセージを表示する。承認ゲート: Approve(Construction へ進む)/ Request Changes。ユーザーはこのゲートでステージの組み込み/除外を上書きできる。

### 出力

すべての成果物を `<record>/inception/delivery-planning/` に書き出す:

| ファイル                              | 内容                                                        |
|---------------------------------------|-------------------------------------------------------------|
| `bolt-plan.md`                        | 順序付けられた Bolt シーケンス。Bolt ごとの Unit of Work、walking-skeleton マーカー、Definition of Done、信頼仮説、期待されるデモ |
| `team-allocation.md`                  | Bolt-to-mob 割り当て。チーム数 > 1 のときの Program Board アナログ。1.5 が実行されなかった場合は AI のみの割り当て |
| `risk-and-sequencing-rationale.md`    | Bolt 順序付けに対する WSJF / risk-first / walking-skeleton-first / value-first の正当化 |
| `external-dependency-map.md`          | 消費する Bolt にマッピングされたゲート項目(外部 API、データの可用性、承認のリードタイム、外部チームへの引き継ぎ) |
| `delivery-planning-questions.md`      | `[Answer]:` タグ付きの明確化のための質問(入力成果物)      |

フェーズ境界検証の出力:

| ファイル                                        | 内容                                        |
|-------------------------------------------------|---------------------------------------------|
| `<record>/verification/phase-check-inception.md` | Inception-to-Construction トレーサビリティチェックの結果 |

### 承認ゲート

標準の2択ゲート: **Approve**(Construction へ進む)/ **Request Changes**。ユーザーはこのゲートでステージの組み込み/除外を上書きできる。

### 備考

- **フェーズ境界ステージ。** これは3つのフェーズ境界ステージのうちの2番目である(1.7 の後、3.7 の前)。検証チェックは Requirements-to-Stories-to-Architecture の整合性を検証する。
- **経済的 vs トポロジカルなシーケンス化。** ステージ 2.7 は依存関係 DAG を生成する(トポロジカル順序は記述的な幾何構造として自然に導かれる)。ステージ 2.8 は人間の価値判断で重み付けされたその DAG 内の経路を選ぶ。risk-first または walking-skeleton-first の論拠がそれを正当化する場合、Bolt 順序はトポロジカル順序から逸脱してもよい — その逸脱は `risk-and-sequencing-rationale.md` で捉えられる。
- **Bolt ≠ スプリント ≠ MMF。** 正式な Glossary によれば、Bolt は Construction ステージ 3.1–3.5 を1回通過するものである(3.6 Build and Test と 3.7 CI Pipeline はすべての Bolt の後に1回実行される)。シーケンス化のヒューリスティック(walking skeleton、WSJF)は Bolt 内に適用される。それらは Bolt が何であるかを再定義するものではない。
- **上流からの意図的な逸脱。** 上流リファレンスはこのステージを "Workflow Planning" と呼び、純粋なステージセレクタとして扱う。この実装(「Delivery Planning」に改名)は Bolt シーケンス化、チーム割り当て、リスク根拠を追加する。
- bolt プランは信頼構築のシーケンスを定義する。各 Bolt は定義された Unit of Work、Definition of Done、信頼仮説を持つ。
- amadeus-architect-agent は、提案された Bolt シーケンスが component-dependency と unit-of-work-dependency 成果物で定義された依存関係を尊重していることを検証する。
- チーム割り当ては、存在する場合は Team Formation 成果物(ステージ 1.5)を参照する。1.5 が SKIP(mvp、workshop)の場合、すべての Bolt は amadeus-developer-agent(AI)によって実行される。

---

## フェーズサマリー

### 主要な出力

Inception フェーズは、Construction と Operation へ引き継がれる以下の主要な出力を生成する:

1. **Reverse Engineering 成果物**(2.1)-- 既存コードベースを文書化する9つの成果物: business overview、architecture、code structure、API documentation、component inventory、technology stack、dependencies、code quality assessment、timestamp。(ブラウンフィールドプロジェクトのみ。)
2. **Requirements 文書**(2.3)-- 正式な要件: 機能、非機能、制約、前提、スコープ外、オープンな質問。
3. **User Stories と Personas**(2.4)-- 受け入れ基準、優先度、依存関係付きのユーザーストーリー。ユーザーペルソナの定義。(該当する場合。)
4. **Refined Mockups**(2.5)-- 中〜高忠実度のモックアップ、インタラクション仕様、デザインシステムのマッピング、アクセシビリティチェックリスト。(該当する場合。)
5. **Application Design**(2.6)-- コンポーネント定義、メソッドシグネチャ、サービス定義、依存関係マトリクス、アーキテクチャ決定記録。(該当する場合。)
6. **Units of Work**(2.7)-- 境界と複雑さの見積もり付きの Unit 定義、ビルド順序付きの Unit 依存関係マトリクス、ストーリー-to-Unit マッピング。(該当する場合。)これは Construction の段階的構築フローを駆動する成果物である。
7. **Delivery Plan**(2.8)-- bolt プラン、ビルド順序、依存関係マトリクス、チーム割り当て。これは Construction と Operation を統制する実行計画である。
8. **フェーズ境界検証**(2.8)-- `<record>/verification/phase-check-inception.md` に書き出された Inception-to-Construction トレーサビリティチェック。

### Construction への引き継ぎ

ステージ 2.8 での承認時、フレームワークは Construction フェーズへ移行する。Construction は Delivery Planning からの実行計画に基づいてステージレベルのタスクを作成し、段階的構築フローを実行する:

Construction は `bolt-plan.md` に従って Bolt ごとに実行し、bolt プランに従って並列バッチが許可される。各 Bolt は1つ以上の Unit の一貫したスライスをカバーする(`unit-of-work.md` と `unit-of-work-dependency.md` に従う):

各 Bolt について:
1. **3.1 Functional Design**(実行計画に応じて条件付き)
2. **3.2 NFR Requirements**(実行計画に応じて条件付き)
3. **3.3 NFR Design**(実行計画に応じて条件付き)
4. **3.4 Infrastructure Design**(実行計画に応じて条件付き)
5. **3.5 Code Generation**(常時、Bolt 内の Unit ごと)

最後の Bolt が完了した後:
6. **3.6 Build and Test**(常時)
7. **3.7 CI Pipeline**(条件付き)

Bolt は依存関係グラフが許す限り並列バッチで実行できる。walking-skeleton Bolt は、並列バッチが始まる前にエンドツーエンドの形を検証するため、常に単一 Bolt バッチとして最初に実行される。完全な Bolt ごとの解説は `docs/guide/04-phases-and-stages.md:263-293` を参照。

### 相互参照

- **Orchestrator**: `dist/claude/.claude/skills/amadeus/SKILL.md` -- ルーティングロジック、スコープ-to-ステージマッピング、ステージグラフ、Construction フロー定義
- **Stage Protocol**: `dist/claude/.claude/amadeus-common/protocols/stage-protocol.md` -- 承認ゲート、質問形式、完了メッセージ、および §13 Learnings Ritual。フェーズ境界検証は `stage-protocol-governance.md` §13 にある。
- **Ideation Phase**: `docs/reference/04-stages/ideation.md` -- 前のフェーズのドキュメント
- **Construction Phase**: Construction ステージはステージ 2.8 が生成したデリバリー計画に従って実行される
- **Deliberate Deviations**: SKILL.md は上流リファレンスからの意図的な差異を文書化する。これには常時再実行 RE ポリシー、amadeus-design-agent サポートの追加、ADR 成果物、Delivery Planning の拡張が含まれる
