# Initialization フェーズのステージ (0.1-0.3)

## フェーズ概要

Initialization フェーズは AI-DLC ワークフローにおける5フェーズのうち最初のフェーズです。ステージ0.1から0.3を実行し、**intent を birth**します — そのレコードディレクトリを `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(以下 `<record>/` と表記)に mint し、状態ファイル、ディレクトリの足場、ワークスペースの分類、ルーティング設定を行います。個別の scaffold コマンドはありません: ワークスペースシェルは `dist/<harness>/` に事前構築された形で出荷され、エンジンは最初の `/amadeus`(または何を作るかを説明したとき)に最初の intent を自動 birth します。

このフェーズの3つのステージはすべての scope について実行されます — CONDITIONAL ステージはありません。すべてのステージは承認ゲートなしで自動進行します。

ウェルカムメッセージはセッション開始時に `settings.json` の `companyAnnouncements` エントリを通じてレンダリングされます。これはステージではありません — ステージファイルも、監査イベントも、チェックボックスもありません。

3つのステージはすべて、1秒未満で完了する単一の決定論的な `bun .claude/tools/amadeus-utility.ts intent-birth --scope <scope>` 呼び出しの内部で実行されます。コンダクターは可観測性のためにサイドバーに3つのタスク(Workspace Scaffold、Workspace Detection、State Init)を作成し、ツールが返ったらそれらすべてを完了としてマークします。

## スコープ駆動のステージ包含

| スコープ | 含まれるステージ |
|-------|----------------|
| enterprise | 0.1-0.3 すべて |
| feature | 0.1-0.3 すべて |
| mvp | 0.1-0.3 すべて |
| poc | 0.1-0.3 すべて |
| bugfix | 0.1-0.3 すべて |
| refactor | 0.1-0.3 すべて |
| infra | 0.1-0.3 すべて |
| security-patch | 0.1-0.3 すべて |
| workshop | 0.1-0.3 すべて |

## ステージ概要

| Slug | # | ステージ名 | 条件 | リードエージェント | モード |
|------|---|------------|-----------|------------|------|
| workspace-scaffold | 0.1 | Workspace Scaffold | ALWAYS | (orchestrator) | auto-proceed |
| workspace-detection | 0.2 | Workspace Detection | ALWAYS | (orchestrator) | auto-proceed |
| state-init | 0.3 | State Initialization | ALWAYS | (orchestrator) | auto-proceed |

---

## ステージ 0.1 — Workspace Scaffold

| フィールド | 値 |
|-------|-------|
| ステージ # | 0.1 |
| Slug | workspace-scaffold |
| フェーズ | Initialization |
| リードエージェント | (orchestrator) |
| support_agents    | — |
| 実行 | ALWAYS |
| モード | Auto-proceed(承認ゲートなし) |

### 手順
1. 必要に応じて `<record>/` ディレクトリを作成する
2. 全5フェーズのステージ成果物ディレクトリ + `<record>/verification/` を作成する
3. 空の space レベルの `amadeus/knowledge/` ディレクトリを作成する(フリーフォーム。エージェントごとのサブディレクトリなし、README なし)
4. intent の `audit/` シャードディレクトリのヘッダーを作成し、`WORKFLOW_STARTED` を発行する
5. `STAGE_STARTED` + `WORKSPACE_SCAFFOLDED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- なし(エントリポイント)

### 出力
- `<record>/initialization/`、`ideation/`、`inception/`、`construction/`、`operation/` とそのステージサブディレクトリ
- `<record>/verification/`
- 空の space レベルの `amadeus/knowledge/` ディレクトリ(space の `intents/` の兄弟)
- intent の `audit/` シャードディレクトリ(ヘッダー + セッション + scaffold イベント)

### 備考
- 冪等 — すでに存在するディレクトリとファイルはスキップする
- LLM 経由ではなく `amadeus-utility intent-birth` の内部で実行される

---

## ステージ 0.2 — Workspace Detection

| フィールド | 値 |
|-------|-------|
| ステージ # | 0.2 |
| Slug | workspace-detection |
| フェーズ | Initialization |
| リードエージェント | (orchestrator — 決定論的なルールベースのスキャナー) |
| support_agents    | — |
| 実行 | ALWAYS |
| モード | Auto-proceed(承認ゲートなし) |

### 手順
1. プロジェクトディレクトリを1階層の深さまで走査し、加えて既知のソースディレクトリ(`src/`、`app/`、`lib/`、`pages/`、`components/`、`tests/`)が存在すればそれらも走査する
2. 拡張子ごとにファイルをカウントし、主要/副次言語を判定する
3. 既知の設定ファイル名(Next.js、Vite、Angular、Nuxt、Remix、Gatsby、Astro、Svelte、NestJS)を通じてフレームワークを検出し、React を `package.json` の依存関係を通じて検出する
4. マニフェスト + ロックファイルを通じてビルドシステムを検出する(npm/yarn/pnpm/bun/poetry/uv/hatch/pip/cargo/go/maven/gradle/composer/bundler)
5. `stages/initialization/workspace-detection.md` のルールを使用して greenfield と brownfield を分類する
6. `STAGE_STARTED` + `WORKSPACE_SCANNED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- プロジェクトのファイルシステム(読み取り専用スキャン)

### 出力
- ワークスペース分類(greenfield/brownfield)
- 技術スタック(言語、フレームワーク、ビルドシステム)
- スキャン結果を捕捉する `WORKSPACE_SCANNED` 監査イベント

### 備考
- `amadeus-utility intent-birth` の内部で決定論的なスキャナーとして実行される。LLM サブエージェントのディスパッチはない。
- シンボリックリンクは辿らない(`lstatSync` によるサイクル保護)
- `.claude/`、`<record>/`、`node_modules/`、`.git/`、`dist/`、`build/`、`.next/`、`target/`、`vendor/` を除外する
- `devDependencies` のみの `package.json` はツーリング/足場として扱われ、それ単独では brownfield 分類を引き起こさない

---

## ステージ 0.3 — State Initialization

| フィールド | 値 |
|-------|-------|
| ステージ # | 0.3 |
| Slug | state-init |
| フェーズ | Initialization |
| リードエージェント | (orchestrator) |
| support_agents    | — |
| 実行 | ALWAYS |
| モード | Auto-proceed(承認ゲートなし) |

### 手順
1. 状態テンプレートを読む
2. スコープマッピング + 深度 + テスト戦略を適用する
3. greenfield の場合、`reverse-engineering` を SKIP としてマークする
4. 初期化後の最初のステージを `[-]` に設定した完全な `<record>/amadeus-state.md` を書き込む
5. `STAGE_STARTED` + `WORKSPACE_INITIALISED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- workspace-detection からのワークスペース分類(同じツール呼び出し)
- スコープ設定(`--scope` フラグまたは `poc` デフォルトから)
- 渡された場合は深度 / テスト戦略のオーバーライド
- `.claude/knowledge/amadeus-shared/state-template.md` からの状態テンプレート

### 出力
- `<record>/amadeus-state.md`(完全に埋められる)
- `WORKSPACE_INITIALISED` 監査イベント

### 備考
- brownfield プロジェクトは reverse-engineering(ステージ2.1)へルーティングされる
- greenfield プロジェクトは初期化以外の最初のステージへルーティングされる(feature/poc の場合は intent-capture、bugfix/refactor の場合は requirements-analysis、workshop の場合は practices-discovery。workshop は Ideation 全体をスキップし、greenfield では reverse-engineering が SKIP へ格下げされるため)
- `/amadeus-init`(明示的な birth パッケージング)から呼び出された場合、オーケストレーターはこのステージの後で停止する
- ワークフロー開始(`/amadeus <scope>` または何を作るかの説明)から呼び出された場合、オーケストレーターは初期化後の最初のステージへ続行する

---

## 再初期化

re-init フラグはありません。最初の intent の birth は intent ごとに1回だけ実行されます。ワークスペースシェル自体は事前構築された形で出荷され、再 scaffold されることはありません。最初からやり直すには、新しい intent を birth する(それぞれが独自の `<record>/` を得ます)か、あるいは — まっさらな状態にするには — アクティブな intent のレコードディレクトリを `amadeus/spaces/<space>/intents/` 配下でアーカイブし、エンジンに新しいものを birth させます。既存の intent に対する2回目の `/amadeus` は、再初期化するのではなくそれを再開します。

## 備考

- 3つのステージはすべて自動進行する — Initialization フェーズには承認ゲートがない
- すべてのステージは `amadeus-state.md` の `Current Stage` を通じてステータスラインを更新する
- すべてのステージは状態チェックボックス(`[ ]` → `[x]`)を更新し、ツールから直接監査イベントを追記する
- Initialization → Ideation のフェーズ遷移にはガバナンス境界チェックがない

## 相互参照

- [Architecture](../01-architecture.md) — 実行モデルの概要
- [Orchestrator](../03-orchestrator.md) — ルーティングロジック
- [Stage Protocol](../04-stage-protocol.md) — 状態追跡のルール
- [Ideation Stages](ideation.md) — 次のフェーズ
