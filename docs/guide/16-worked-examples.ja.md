# ワークスルー例

AI-DLC の動作を示す 2 つの完全なウォークスルー: bugfix と feature。各々は、
コマンドの起動、ステージの進行、承認ゲート、成果物の出力を実演します。

> **ハーネスに関する注記。** これらのトランスクリプトは **Claude Code** 上で
> 記録されているため、そのサーフェス — `/amadeus`、`Task` 呼び出しで
> ディスパッチされるサブエージェントステージ — を示します。ステージフロー、
> ゲート、成果物はどのハーネスでも同一で、異なるのはディスパッチのメカニズムだけです
> (Kiro は `subagent` ツールを、Codex は `codex exec` ワーカーを使います)。
> [他のハーネスで実行する](harnesses/README.ja.md) を参照。

---

## Bugfix ウォークスルー

この例はユーザープロファイル API の null ポインタ例外を修正します。**bugfix**
スコープは Minimal 深さで 7 ステージ(Initialization 3 + ドメイン 4)を実行します。

### 起動

```
/amadeus bugfix
```

コンダクターは何を修正したいかを尋ねます:

> **何を構築しますか?**

あなたはこう応答します:

> ユーザープロファイル API は `display_name` フィールドが null のとき HTTP 500 を返します。`GET /api/v1/users/:id/profile` エンドポイントが `ProfileSerializer.serialize()` で NullPointerException によりクラッシュします。これは display_name が必須化される前に作成されたユーザープロファイルの約 12% に影響します。

### 実行されるステージ

| # | ステージ | フェーズ | リードエージェント | モード |
|---|-------|-------|------------|------|
| 0.1 | Workspace Scaffold | Initialization | orchestrator | inline(自動進行) |
| 0.2 | Workspace Detection | Initialization | orchestrator | inline(自動進行) |
| 0.3 | State Init | Initialization | orchestrator | inline(自動進行) |
| 2.1 | Reverse Engineering | Inception | amadeus-developer-agent + amadeus-architect-agent | subagent |
| 2.3 | Requirements Analysis | Inception | amadeus-product-agent | inline |
| 3.5 | Code Generation | Construction | amadeus-developer-agent | subagent |
| 3.6 | Build and Test | Construction | amadeus-quality-agent | inline |

### Initialization(ステージ 0.1-0.3) — 自動進行

3 つの Initialization ステージは、ユーザー対話なしに、1 つの決定論的ツール呼び出し
(`amadeus-utility init`)として 1 秒未満で実行されます:

- **0.1 Workspace Scaffold** — 最初の intent を auto-birth し、そのレコード
  ディレクトリを `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(以下 `<record>/`
  と表記)に作成します — `<YYMMDD>` はレコードが時系列にソートされるようコンパクトな
  UTC 日付接頭辞で、`<label>` はリクエストに対するコンダクターの短い kebab-case の
  エッセンスです。正典的な id は `intents.json` レジストリ行に持たれる UUIDv7 です
- **0.2 Workspace Detection** — ルールベースのスキャンで Java 17、Spring Boot 3.2、
  Maven、brownfield プロジェクトを識別します
- **0.3 State Init** — `amadeus-state.md` をスコープ `bugfix`、深さ `Minimal`、
  実行対象のドメインステージのマーク付きで初期化します

> 進捗: 全体 3/7 | INITIALIZATION ステージ 3/3 完了。次: Reverse Engineering

### ステージ 2.1 — Reverse Engineering

2 ステップのサブエージェントがコードベースをスキャンします: まず amadeus-developer-agent
のコードスキャン、次に amadeus-architect-agent の統合。`<record>/inception/reverse-engineering/`
に 9 個の成果物を生成します:

| 成果物 | 内容 |
|----------|----------|
| `business-overview.md` | ユーザーサービス — プロファイル、設定、認証トークン |
| `architecture.md` | Spring Boot モノリス、3 層設計 |
| `code-structure.md` | 6 パッケージ: controller、service、model、repository、serializer、config |
| `api-documentation.md` | `/api/v1/users/` 配下の 8 個の REST エンドポイント |
| `component-inventory.md` | コントローラー、サービス、リポジトリ、シリアライザをカタログ化 |
| `technology-stack.md` | Java 17、Spring Boot 3.2、PostgreSQL 15、Jackson 2.15 |
| `dependencies.md` | Maven 依存ツリー、サードパーティライブラリ、バージョン制約 |
| `code-quality-assessment.md` | テストカバレッジ 62%、基本的な CI |
| `reverse-engineering-timestamp.md` | スキャンがいつ、どのコミットに対して実行されたか |

**承認ゲート:**

```
Reverse Engineering complete. How would you like to proceed?
- Approve        -> Continue to Requirements Analysis
- Request Changes -> Provide revision feedback
```

あなたは **Approve** を選びます。

### ステージ 2.3 — Requirements Analysis

amadeus-product-agent ペルソナがロードされ、`<record>/inception/requirements-analysis/requirements-analysis-questions.md`
に明確化のための質問を作成します:

```markdown
## Q1: Bug Severity Classification
How severe is this bug for your users?
A. Critical — causes data loss or security exposure
B. High — blocks a core workflow for affected users
C. Medium — degraded experience but workaround exists
D. Low — cosmetic or minor inconvenience
X. Other (please specify)

[Answer]:
```

コンダクターはインタラクションモードを提示します:

```
How would you like to answer these questions?
- Guide me        -> Walk through each question interactively
- Grill me        -> One question at a time, in depth, with recommended answers
- I'll edit the file -> Fill in answers directly
- Chat            -> Discuss freely
```

あなたは **Guide me** を選び、こう答えます: Q1 = High、Q2 = ユーザー名をフォール
バックとして、Q3 = null を適切に扱う(マイグレーションなし)。

コンダクターは 3 つの機能要件(null 処理、シリアライザ修正、フォールバックロジック)
と 1 つの非機能要件(レスポンスタイムの後退なし)を持つ `requirements.md` を生成します。

**承認ゲート:** あなたは **Approve** を選びます。

### ステージ 3.5 — Code Generation

コンダクターはコード生成プランを作成し、次に amadeus-developer-agent サブエージェントに
委譲します:

**プラン:**
1. `ProfileSerializer.serialize()` を null の `display_name` を扱うよう修正
2. null/non-null ケースのユニットテストを追加
3. `ProfileService.getProfile()` の防御的チェックを修正
4. API エンドポイントの統合テストを追加

あなたはプランを承認します。サブエージェントは 4 ステップすべてを実装します:

- **変更**: `ProfileSerializer.java`(ユーザー名フォールバック付きで null 安全)
- **変更**: `ProfileService.java`(防御的な null 処理)
- **作成**: `ProfileSerializerTest.java`(2 ユニットテスト)
- **作成**: `ProfileControllerIntegrationTest.java`(2 統合テスト)

**承認ゲート:** あなたは **Approve** を選びます。

### ステージ 3.6 — Build and Test

amadeus-quality-agent がビルドとテストを実行します:

```
mvn clean compile        # BUILD SUCCESS
mvn test                 # 89 tests, 0 failures
mvn verify               # Integration tests pass
```

結果は `<record>/construction/build-and-test/test-results.md` に捕捉されます:
89 テスト合格、0 失敗、カバレッジが 62% から 64% に増加。

**承認ゲート:** あなたは **Approve** を選びます。ワークフロー完了。

### 終了状態

```
amadeus/spaces/default/intents/260624-null-display-fix/
  amadeus-state.md              # 全 7 ステージが [x] マーク
  audit/                      # 完全な決定証跡(per-clone シャード)
  inception/
    reverse-engineering/       # 9 個の RE 成果物
    requirements-analysis/     # requirements.md + 質問
  construction/
    bugfix-null-display-name/
      code-generation/         # プラン + サマリー
    build-and-test/            # 手順 + テスト結果
```

ワークスペースルートのアプリケーションコード:
- `ProfileSerializer.java`(変更)
- `ProfileService.java`(変更)
- `ProfileSerializerTest.java`(作成)
- `ProfileControllerIntegrationTest.java`(作成)

### 主要な観察点

1. **すべてのドメインステージでの承認ゲート** — 各決定をあなたが制御します
2. **Minimal 深さ** — 簡潔で対象を絞った成果物。修正を定義するのに必要な質問のみ
3. **サブエージェント委譲** — 重い作業(RE、コード生成)はあなたが承認する間にサブプロセスで実行されます
4. **完全な監査証跡** — すべての決定が ISO タイムスタンプ付きでログされます
5. **セッション resume** — どの時点で中断されても、`/amadeus` が進行中の状態を検出します

---

## Feature ウォークスルー

この例はタスク管理アプリケーションの通知サービスを構築します。**feature** スコープは
Standard 深さで全 32 ステージを実行します。このウォークスルーは全フェーズにわたる
主要ステージをハイライトします。

### 起動

```
/amadeus feature
```

> **何を構築しますか?**

> 私たちのタスク管理アプリの通知サービスです。ユーザーは、タスクが割り当てられたとき、期限が近づいたとき、コメントが投稿されたときに、アプリ内通知と任意のメールダイジェストを受け取るべきです。ユーザーごとの通知設定をサポートします。

### Initialization(ステージ 0.1-0.3) — 自動進行

3 つの Initialization ステージは `amadeus-utility init` 内で自動的に実行されます。
Workspace Detection は次を識別します: TypeScript、Node.js 20、Express、PostgreSQL、
既存のタスクサービスとユーザーサービスを持つ brownfield プロジェクト。

> 進捗: 全体 3/32 | スコープ: feature、深さ: Standard

### Ideation フェーズ(ステージ 1.1-1.7)

**ステージ 1.1 — Intent Capture**(amadeus-product-agent)

amadeus-product-agent があなたの intent を捕捉し、`intent-statement.md` と
`stakeholder-map.md` を生成します。質問はターゲットユーザー、通知チャネル、優先度に
焦点を当てます:

```
Q1: Which notification channels are in scope?
A. In-app only
B. In-app + email
C. In-app + email + push
D. In-app + email + push + SMS
X. Other
```

あなたは B(アプリ内 + メール)を答えます。承認後、ステージは通知タイプをユーザー
トリガーにリンクする構造化された intent statement を生成します。

**ステージ 1.4 — Scope Definition**(amadeus-product-agent)

スコープ境界を定義します: in-scope(3 つのトリガータイプ、ユーザー設定、メール
ダイジェスト)、out-of-scope(プッシュ通知、SMS、リアルタイム WebSocket)。優先順位
付けされた項目を持つ `scope-document.md` と `intent-backlog.md` を生成します。

**ステージ 1.7 — Approval & Handoff**(amadeus-delivery-agent)

すべての Ideation 出力を集約する initiative brief をコンパイルします。フェーズ境界
検証が intent から scope へのトレーサビリティを確認します。

> 進捗: 全体 10/32 | IDEATION 完了。検証ゲート合格。

### Inception フェーズ(ステージ 2.1-2.8)

**ステージ 2.1 — Reverse Engineering**(subagent)

既存コードベースの 2 ステップスキャン。通知サービスが統合しなければならない既存の
サービス構造、データベーススキーマ、API パターンを識別します。

**ステージ 2.2 — Practices Discovery**(amadeus-pipeline-deploy-agent)

amadeus-pipeline-deploy-agent がこのステージをリードし、amadeus-quality-agent、
amadeus-developer-agent、amadeus-devsecops-agent がサポートします。これは brownfield
プロジェクトなので、Reverse Engineering の成果物を消費してチームの既存プラクティスを
推論します — テストフレームワークとカバレッジの慣習、CI/lint のセットアップ、
ブランチとレビューの規範。`team-practices.md`、`discovered-rules.md`、`evidence.md`
を生成します。承認されると、発見されたプラクティスは `amadeus/spaces/<space>/memory/team.md`
と `amadeus/spaces/<space>/memory/project.md` に昇格され、下流のステージがそれらを
尊重します。

**ステージ 2.3 — Requirements Analysis**(amadeus-product-agent)

12 個の機能要件(通知トリガー、設定 CRUD、メールレンダリング、ダイジェスト
スケジューリング)と 5 個の非機能要件(配信レイテンシ < 5s、メールリトライ、
設定ストレージ)を生成します。質問はエッジケースを掘り下げます: メール配信が失敗
したらどうなるか? ダイジェストはどのくらいの頻度で実行すべきか?

**ステージ 2.6 — Application Design**(amadeus-architect-agent)

amadeus-architect-agent が通知サービスのアーキテクチャを設計します:

- **コンポーネント**: NotificationService、PreferenceService、EmailRenderer、DigestScheduler
- **API 契約**: 設定管理用の REST エンドポイント、トリガー用の内部イベントハンドラ
- **ADR**: イベント駆動トリガーパターン(vs. ポーリング)、メールキュー用の SQS(vs. 直接送信)

`components.md`、`services.md`、`decisions.md` を生成します。

**ステージ 2.7 — Units Generation**(amadeus-architect-agent)

3 つの作業単位に分解します:

1. **notification-core** — イベントハンドラ、通知ストレージ、アプリ内配信
2. **notification-preferences** — 設定 CRUD API、デフォルト設定
3. **notification-email** — メールレンダラー、SQS 統合、ダイジェストスケジューラ

依存マップ付きの `unit-of-work.md` を生成します: notification-core が最初、
次に preferences と email が並行。

**ステージ 2.8 — Delivery Planning**(amadeus-delivery-agent)

Bolt シーケンス: Bolt 1 は notification-core を出荷(walking skeleton — イベント
ハンドラパイプラインをエンドツーエンドで証明)。Bolt 2 は notification-preferences と
notification-email を並行で出荷。Bolt ごとの DoD は `bolt-plan.md` に、WSJF 風の
根拠は `risk-and-sequencing-rationale.md` に、外部の SES/SQS 依存は
`external-dependency-map.md` に捕捉されます。フェーズ境界検証が requirements から
architecture への整合を確認します。

> 進捗: 全体 18/32 | INCEPTION 完了。検証ゲート合格。

### Construction フェーズ(ステージ 3.1-3.7)

Construction は 2.8 のプランに従って **Bolt ごと** に実行されます。最初の Bolt は
walking skeleton で、その後のラダープロンプトが残りの自律性を決めます。共有依存を
持つ Bolt は並行実行されます。

**Bolt 1: notification-core** — walking skeleton(常にゲート)

この Bolt はイベントハンドラパイプラインが動作することを証明するエンドツーエンドの
スライスです: 通知イベントが内部ハンドラに到着し、ストレージに落ち、アプリ内配信
エンドポイントに現れる。コンダクターは notification-core について 3.1–3.4 にわたる
1 ラウンドの質問でこれを開き、すべての設計成果物を生成し、次にコード生成を
amadeus-developer-agent サブエージェントに委譲します。

- **3.1 Functional Design** — ドメインエンティティ(Notification、NotificationEvent)、ビジネスルール(重複排除、レートリミット)
- **3.5 Code Generation** — イベントハンドラ、通知リポジトリ、アプリ内配信エンドポイント。ソース 3 ファイル、テスト 4 ファイル。

Walking-skeleton ゲート — Bolt 1 のコードサマリーをレビューし承認します。

承認直後、**ラダープロンプト** が発火します:

```
The walking skeleton shipped. How should the remaining Bolts run?
  ▸ Continue autonomously
    Run remaining Bolts without gates. Failures still halt and ask.
  ▸ Gate every Bolt
    Present an approval gate after each Bolt (or parallel batch).
```

形が機能するのを見たので、**Continue autonomously** を選びます。コンダクターは
`amadeus-state.md` に `Construction Autonomy Mode: autonomous` を記録し、
`AUTONOMY_MODE_SET` を発行します。

**Bolt 2: notification-preferences + notification-email** — 並列バッチ

両方とも notification-core にのみ依存し、互いに依存しないため、2.8 のプランは
それらを 1 つのバッチにスケジュールします。コンダクターは Bolt ごとに質問を集めて
設計成果物を生成し、次に 1 ターンで 2 つの `Task` 呼び出しを発行して
**両方のコード生成ステージを並行に** ディスパッチします。

- **notification-preferences — 3.1 Functional Design** — 設定エンティティ、デフォルト値、チャネルトグル
- **notification-preferences — 3.5 Code Generation** — CRUD API エンドポイント、設定リポジトリ、検証。ソース 2 ファイル、テスト 3 ファイル。
- **notification-email — 3.2 NFR Requirements** — メール配信の信頼性(指数バックオフでのリトライ)、ダイジェストスケジューリングの正確性
- **notification-email — 3.4 Infrastructure Design** — SQS キュー、SES 統合、デッドレターキュー用の CloudWatch アラーム
- **notification-email — 3.5 Code Generation** — メールレンダラー、SQS コンシューマ、ダイジェスト cron ジョブ。ソース 4 ファイル、テスト 5 ファイル。

両方のサブエージェント Task は次のターンで返ります。自律を選んだので、バッチゲートは
なし — Construction はそのまま 3.6 に進みます。

**失敗はどう見えるか。** `notification-email` の Code Generation が壊れた SES モックで
返ったとします。コンダクターは `notification-preferences` の完了を待ち、その成果物を
ディスク上に保持し、次を提示します:

```
Bolt notification-preferences succeeded. Bolt notification-email failed during code generation:
  "SES client mock could not be constructed — check test config."

Options:
  ▸ Retry         Re-run notification-email from code generation.
  ▸ Skip          Mark notification-email skipped and continue. Dependent Bolts may also fail.
  ▸ Abort         Stop Construction. Resume via /amadeus --stage code-generation.
```

あなたは **Retry** を選び、モックのセットアップを修正すると、notification-email だけが
再実行されます。Preferences はすでに `[x]` 完了です。

**ステージ 3.6 — Build and Test**(amadeus-quality-agent、すべての Bolt 後に 1 回実行)

ビルド手順を生成し、3 つの Unit すべてにわたるフルテストスイートを実行します:
47 テスト合格、0 失敗、カバレッジ 78%。

**ステージ 3.7 — CI Pipeline**(amadeus-pipeline-deploy-agent)

lint、build、test、セキュリティスキャンのステージを持つ CI パイプラインを設定します。
品質ゲート: カバレッジ >= 75%、クリティカルな脆弱性なし。

> 進捗: 全体 25/32 | CONSTRUCTION 完了。検証ゲート合格。

### Operation フェーズ(ステージ 4.1-4.7)

**ステージ 4.1 — Deployment Pipeline** — ヘルスチェックゲート付きの Blue-Green デプロイ戦略

**ステージ 4.2 — Environment Provisioning** — SQS キュー、SES 設定、通知ストレージ用の DynamoDB テーブル

**ステージ 4.4 — Observability Setup** — 通知配信レイテンシ、メール送信レート、デッドレターキュー深さの CloudWatch ダッシュボード。配信失敗のアラーム。

**ステージ 4.7 — Feedback & Optimization** — SLO ターゲット(アプリ内配信 99.9%、30s 以内のメール配信 99%)、コスト分析、フィードバックループドキュメント。

> 進捗: 全体 32/32 | OPERATION 完了。feature ワークフロー完了。

### bugfix との主な違い

| 側面 | Bugfix | Feature |
|--------|--------|---------|
| 実行ステージ数 | 7 | 32 |
| 深さ | Minimal | Standard |
| フェーズ | Initialization + Inception + Construction | 全 5 |
| 作業単位 | 1 | 3 |
| Bolt ごとの Construction | いいえ(bugfix は単一 Bolt) | はい — 2 Bolt(walking skeleton + 1 並列バッチ) |
| 条件付きステージ | ほとんどスキップ | ほとんど実行 |
| 承認ゲート | 4 | walking skeleton + ラダープロンプト。残りの Bolt は autonomy mode 次第 |

---

## 次のステップ

- [スコープ、深さ、テスト戦略](05-scopes-and-depth.ja.md) — スコープがどのステージを実行するかを決める仕組み
- [ステージがどう実行されるか](04-phases-and-stages.ja.md) — ステージプロトコルの詳細
- [エージェント](06-agents.ja.md) — エージェントのペルソナと責務
- [成果物リファレンス](14-artifacts-reference.ja.md) — 完全な成果物ディレクトリツリー
