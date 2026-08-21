# コントリビューション

> 言語: [English](11-contributing.md) | **日本語**

## 概要

この実装へのコントリビューションを歓迎します。このガイドでは、前提条件、開発ワークフロー、テスト、そして変更を提出する方法を扱います。

> **パス規約。** 以下の `<record>/` = 誕生した intent の record ディレクトリ、
> `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` — intent ごとの state、監査
> シャード、ナレッジ、成果物が置かれる場所です。

## 前提条件

- **Claude Code** -- ネイティブインストール(推奨、自動更新)。macOS/Linux/WSL は `curl -fsSL https://claude.ai/install.sh | bash`、Windows PowerShell は `irm https://claude.ai/install.ps1 | iex`。あるいは `brew install --cask claude-code`。([Claude Code docs](https://code.claude.com/docs/en/quickstart) を参照)
- **bun** -- すべての CLI ツールとすべてのフレームワークフックに必須。`curl -fsSL https://bun.sh/install | bash` でインストールします。Windows では `npm install -g bun` または `powershell -c "irm bun.sh/install.ps1 | iex"`。非対話シェルの PATH に含まれている必要があります(zsh は `~/.zshenv`、bash / Windows の Git Bash は `~/.bashrc`)。
- **timeout**(GNU coreutils)-- テストスイートが LLM テストのタイムアウト(L2/L3)に使用するため必須。Linux にはプリインストールされています。macOS では `brew install coreutils` の後、gnubin を PATH に追加します: `export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"`(`~/.zshenv` または `~/.zshrc` に記述)。
- **Bash** -- POSIX 互換ラッパー(`tests/run-tests.sh`)向けの任意項目。主要なテストランナーは `bun tests/run-tests.ts` です。実行時には、配布可能なフックのいずれも Bash を必要としません。
- **ライブなモデルプロバイダアクセス** -- ライブの統合テストと e2e テスト(L2/L3)の実行に必須。L1 プロトコルテストには不要です。

## リポジトリ構造

```
packages/framework/core/                # 手書きの、ハーネス中立なソース(tools, stages, agents, rules, knowledge, hooks)
packages/framework/harness/<name>/      # ハーネスごとに書かれた表層(manifest、オーケストレーター skill、settings/config; 例 claude/, kiro/, codex/)
scripts/package.ts   # ビルド: packages/framework/core/ + packages/framework/harness/ から dist/<harness>/ を再生成
scripts/promote-self.ts # プロジェクトローカルのドッグフーディングインストール: 生成されたセルフインストール表層すべて(.claude/.codex/.agents/.cursor/.opencode/.kimi-code/.pi)をプロジェクトルートへ昇格(ワークスペースの memory は決して上書きしない)
dist/<harness>/      # ignoreされる使い捨てのローカルビルド出力。bun run build で再生成する
tests/               # すべて TypeScript のテストスイート(t*.test.ts、bun で実行)
docs/                # ドキュメント
  guide/             # ユーザーガイド(AI-DLC の使い方)
  harness-engineering/  # ハーネスエンジニアガイド(コードなしで AI-DLC を設定する)
  reference/         # 開発者リファレンス(内部でどう動くか)
```

完全なアーキテクチャについては [reference/01-architecture.md](01-architecture.ja.md) を参照してください。

## 開発ワークフロー

1. **`main` からフォークしてブランチを切る**
2. **アーキテクチャを読む** -- [reference/01-architecture.md](01-architecture.ja.md) は実行モデル、エージェント委譲、フックシステムを説明します
3. **エントリポイントを理解する** -- 決定論的エンジン `packages/framework/core/tools/amadeus-orchestrate.ts`(`next` / `report`)がルーティングを所有し、コンダクター `packages/framework/harness/claude/skills/amadeus/SKILL.md` はそのディレクティブに従って動作する薄い転送ループです。正となるエンジン / ディレクティブ / コンダクター / swarm の契約については [The Skill System](17-skill-system.ja.md) を参照してください
4. **変更を加える** -- `packages/framework/core/` のハーネス中立ソース(tools, stages, agents, hooks, rules, knowledge)、または `packages/framework/harness/<name>/` のハーネス表層(オーケストレーター skill、settings)を編集します。fresh cloneではハーネス起動前に `bun install --frozen-lockfile` と `bun run build` を実行します。生成された `dist/` とself-install面はignoreされるローカル出力なのでstageしません
   - フレームワークツリーはプラグインをimportできません。プラグインはopt-inで各自のmanifestから合成されるため、`packages/framework/core/**` と `packages/framework/harness/**` は `plugins/…` や `<harness-dir>/plugins/…` を参照してはなりません。許可される方向はプラグインがcoreに依存する側です。提出前に `bun run plugin-boundary:check` を実行します。CIはこれをblockingゲートとして実行します
5. **ドッグフーディング時はローカルビルドする** -- `bun run build` は全 `dist/<harness>/` を生成し、このリポジトリのプロジェクトローカルな `.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`、`.kimi-code/`、`.pi/` を更新します。このとき追跡されたbootstrap/configuration allowlistとper-user runtime状態は保持されます。`amadeus/spaces/default/memory/` は手編集されるmethod正本なので意図的に昇格されません。提出前に `bun run source-only:check` を実行します。CIは隔離した2回のビルドもbyte単位で比較します
6. **テスト** -- 提出前に `bun tests/run-tests.ts` を実行します
7. **提出** -- `main` に対して PR を開きます

## テスト

このスイートは完全に TypeScript(`t*.test.ts`、`bun` で実行)で、`smoke`、`unit`、`integration`、`e2e`、`perf` のレベルにわたります。前の4つは 3 層ピラミッド(smoke + unit = L1 Protocol、integration = L2 Stage、e2e = L3 Acceptance)にマッピングされ、`perf` は `--ci` の外に置かれた wall-clock 層です。L1 は依存関係なしでローカル実行されます。ライブの統合テストと e2e ファイルは、該当する CLI ツールと動作するモデルプロバイダの認証情報を必要とし、その基盤が存在しない場合はクリーンにスキップします。

**クイックリファレンス:**

```bash
# L1 Protocol -- 数秒で実行、依存関係なし
bun tests/run-tests.ts

# L2 Stage -- CI パイプライン(claude CLI ツールが必要)
bun tests/run-tests.ts --ci

# L3 Acceptance -- リリースゲート(claude CLI ツールが必要)
bun tests/run-tests.ts --release

# POSIX 互換ラッパー
bash tests/run-tests.sh --ci

# 個別レベル
bash tests/run-tests.sh --smoke        # ファイル構造の検証
bash tests/run-tests.sh --unit         # フックの振る舞い、ステージのコンテンツ
bash tests/run-tests.sh --integration  # コンポーネント横断およびステージ/CLI テスト
bash tests/run-tests.sh --e2e          # ワークフロー、worktree、ターミナルのジャーニー
bash tests/run-tests.sh --perf         # wall-clock ベンチマーク(--ci には決して含まれない)
```

`perf` 層は `.github/workflows/perf.yml` の日次スケジュールと手動 dispatch で実行されます。この workflow は `ci.yml` から移設された Intent Mirror ベンチマークのジョブも持ちます。workflow は非 blocking で、`ci-success` からもブランチ保護からも外れているため、赤くなっても Pull Request をゲートしません。ただし失敗は Actions タブと実行の step summary で loud に残ります。

完全なテスト戦略、スタブ、新しいテストの追加方法については [reference/09-testing.md](09-testing.ja.md) を参照してください。

## ユーティリティハンドラの追加

> **監査イベントを追加する前に**、[State Machine](12-state-machine.ja.md) を読んでください。この章はタクソノミー内のすべてのイベント、その発行元、そして「同一コミットルール」を列挙しています — コードと章のテーブルを同じ PR で更新してください。さもないとドリフトテストが失敗します。

ユーティリティハンドラは 2 つのカテゴリに分かれます。

### 決定論的ハンドラ(推奨)
LLM 推論を必要としないハンドラ(テキストの出力、ファイルの読み取り/整形、前提条件のチェック、ディレクトリの作成)向け:
1. `packages/framework/core/tools/amadeus-utility.ts` にサブコマンドを追加する
2. SKILL.md から単一の Bash 呼び出しでディスパッチする: `bun .claude/tools/amadeus-utility.ts <subcommand>`
3. タスクトラッキングは不要 -- スクリプトは 1 秒未満で実行される
4. 監査ログはスクリプト内で `amadeus-audit.ts` の `appendAuditEntry` を通じて処理する(ジャーナルレコードを手書きしない)

`--help`、`--version`、`--status`、`--doctor` ハンドラはリファレンス実装です。

`codekb-path` ハンドラは読み取り専用の **クエリコマンド**(`intent <name>` や `space` と同様)です: ステージのプロースからディスパッチされ、監査イベントを発行せず、SKILL.md のタスクトラッキングを駆動せず、ディレクトリを作成しません(`mkdir`)。reverse-engineering ステージが成果物を書き込む、リポジトリごとの正規 codekb ディレクトリを単に出力するだけです。これによりプロースがそのパスを手で導出することがなくなります。

### LLM 駆動ハンドラ
エージェントの推論から恩恵を受けるハンドラ(ファイルシステムのスキャン、意思決定)向け:
1. **タスクトラッキング** -- 論理ステップごとに `TaskCreate` でタスクを作成し、作業の進行に応じて `TaskUpdate`(`in_progress` -> `completed`)で遷移させます。これが Claude Code のタスクサイドバーを駆動します。
2. **ステータスラインの更新** -- アクティブな intent の `amadeus-state.md` が存在する場合、`Current Stage` を一時的に、実行中のユーティリティを表す値(例: `running health check`)に設定し、完了時に元の値を復元します。`amadeus-statusline.ts` フックがこのフィールドをターミナルのステータスバーのために読み取ります。
3. **監査ログ** -- 適切なツールのサブコマンドを呼び出します(例: 内部で `appendAuditEntry` を呼ぶ `bun .claude/tools/amadeus-utility.ts <handler>`)。LLM のプロースからジャーナルレコードを手書きしてはいけません — [State Machine: Forbidden patterns](12-state-machine.ja.md) を参照してください。

`intent-birth` ハンドラは完全に決定論的です: 3 つの init ステージ(workspace-scaffold、workspace-detection、state-init)すべてが単一の `amadeus-utility intent-birth` 呼び出しの中で実行されます。ウェルカムメッセージはセッション開始時に `settings.json` の `companyAnnouncements` を通じてレンダリングされ、ステージではありません。

## スコープの追加

スコープはファイル(その identity)とステージごとのメンバーシップタグとして作成されます。identity は `packages/framework/core/scopes/amadeus-<name>.md` に存在し、メンバーシップは `packages/framework/core/amadeus-common/stages/` 配下の各ステージのフロントマター `scopes:` リストに存在します。`init`、`scope-change`、`resolve-env-scope`、`doctor`、および state ツールにまたがる検証ロジックは、実行時に `packages/framework/core/tools/amadeus-lib.ts` の `validScopes()` を通じて `.claude/scopes/*.md` ファイルから有効なスコープのリストを導出します。EXECUTE/SKIP グリッドはステージごとの `scopes:` リストの転置であり、`tools/data/scope-grid.json` にコンパイルされます。スコープの追加に TypeScript の編集は不要です。

### 手順

1. **`packages/framework/core/scopes/amadeus-hotfix.md` を作成する** — スコープの identity です。フロントマター:
   - `name`(必須): スコープ名。ファイル名のステムと一致しなければなりません。
   - `depth`(必須): `Minimal` | `Standard` | `Comprehensive`。
   - `keywords`(任意): `/amadeus <freeform text>` 自動検出のための NL トリガー。単語境界でマッチし、アルファベット順のスコープでタイブレークします。空のリストは推論をオプトアウトします。
   - `description`(任意): `/amadeus --help` と SKILL.md のコンパイル済みスコープテーブルでレンダリングされる 1 行の要約。
   - `testStrategy`(任意): depth とは独立してテスト戦略を上書きします(例: workshop 向けの `Minimal`)。デフォルトは depth に一致します。

   本文はスコープの意図をプロースで記述します — 「なぜこれらのステージか、なぜあれらをスキップするか」。`validScopes()` は `.claude/scopes/*.md` の存在から導出するため、ファイルが着地した瞬間にスコープは有効になります。構造的な問題を検出するため、編集後に `/amadeus --doctor` を実行してください。

   ```yaml
   ---
   name: hotfix
   depth: Minimal
   keywords:
     - hotfix
     - urgent
   description: Urgent production fix
   ---

   # hotfix scope

   Lean path for the urgent production patch — regression test and deploy, nothing else.
   ```

2. **メンバーとなるステージにタグを付ける** — `hotfix` で実行すべき各ステージ(`packages/framework/core/amadeus-common/stages/<phase>/` 配下)で、そのフロントマターの `scopes:` リストに `hotfix` を追加します。タグを付けなかったステージはそのスコープでは `SKIP` になります。3 つの initialization ステージ(`workspace-scaffold`、`workspace-detection`、`state-init`)は必ず含めなければなりません — 常に実行されるためです。

3. **再コンパイル + スコープテーブルの再生成** — `bun .claude/tools/amadeus-graph.ts compile` が `scopes:` タグを `tools/data/scope-grid.json` に転置します。次に `bun .claude/tools/amadeus-utility.ts scope-table` が正規の Markdown テーブルを出力するので、`packages/framework/harness/claude/skills/amadeus/SKILL.md` の `<!-- BEGIN: compiled ... -->` / `<!-- END: compiled ... -->` マーカーの間に貼り付けます。`bun .claude/tools/amadeus-graph.ts compile --check` と `bun .claude/tools/amadeus-utility.ts scope-table --check` を実行して終了コード 0(ドリフトなし)を確認します。

4. **スコープが解決されることを確認する** — `bun packages/framework/core/tools/amadeus-utility.ts init --scope hotfix --project-dir /tmp/scope-smoke` が成功し、`Scope: hotfix` を持つ state ファイルが生成されるはずです。

5. **`doctor` が env デフォルトとして受け入れることを確認する** — `AMADEUS_DEFAULT_SCOPE=hotfix bun amadeus-utility.ts doctor` が env 変数を有効として報告するはずです。

6. **キーワード推論を確認する**(`keywords` が入力されている場合)— `bun amadeus-utility.ts detect-scope --from-text --input "urgent customer issue" --project-dir /tmp/scope-smoke` が `{"scope":"hotfix","source":"keyword","matches":["urgent"]}` を返すはずです。

7. **プランの整合性を確認する**(任意だが推奨)— `AMADEUS_GRAPH_RESOLVE=1 bun .claude/tools/amadeus-graph.ts resolve hotfix --stdout` がスコープのプランを出力します。EXECUTE セットがタグ付けした内容と一致することを目視で確認してください。

8. **スコープ対応ドキュメントを更新する** — `docs/guide/05-scopes-and-depth.md`(完全なスコープリファレンス)、`docs/guide/13-customization.md`(有効値のリストとスコープテーブル)、`docs/reference/03-orchestrator.md`(スコープからステージへのマッピング)はいずれもスコープを明示的に列挙しています。この章の末尾のドキュメントポリシーに従い、同じ PR で更新してください。

9. **スコープルーティングのワークフローテストを追加する** — スコープが既存のスコープと異なる振る舞い(新しいフェーズスキップパターン、新しい depth の組み合わせ)を持つ場合、`tests/e2e/t53.test.ts`(sdk スコープルーティング)または `tests/e2e/t-tui-t50-fix-scope.serial.test.ts`(tui スコープの通し実行)を手本にしたルーティング済みジャーニーテストを追加します。

### 自動的に検証されるもの

- `validScopes().has("hotfix")` は `.claude/scopes/amadeus-hotfix.md` ファイルが着地した瞬間に `true` を返します — すべての検証箇所がこのヘルパーを使用します。
- エラーメッセージはコード変更なしで新しいスコープをアルファベット順に列挙します。
- `/amadeus --doctor` は `AMADEUS_DEFAULT_SCOPE=hotfix` を有効として扱います。
- `amadeus-utility scope-change --scope hotfix` を実行中のワークフローに対して行うと、新しいスコープを受け入れます。
- 転置ドリフトガード: `amadeus-graph compile --check` は、ステージの `scopes:` タグが `scope-grid.json` を再コンパイルせずに編集された場合にビルドを失敗させます。SKILL.md のコンパイル済みスコープテーブルには独自の `--check` ドリフトガード(t67)があります。
- 自由形式 `/amadeus <text>` 呼び出しのキーワード検出は、各スコープの `keywords` をその `.claude/scopes/*.md` フロントマターから読み取ります。独自の NL トリガーを持つカスタムスコープは、`keywords` リストが入力されるとすぐに自動検出されます(SKILL.md の変更は不要)。ユーザーは依然として `--scope hotfix` を明示的に渡して推論をバイパスできます。

### 自動的には検証されないもの

- スコープ名にタイプミスがある `scopes:` タグでもコンパイルは通ります — 誰も要求しないグリッドの列が生成されるだけで、そのステージが実際のスコープから静かに脱落します。`/amadeus --doctor` とスコープごとのテストがガードレールです。
- ステージスキップのセマンティクス(`PHASE_SKIPPED` イベント)。`tests/integration/t39.test.ts` は既知の 10 個のスコープ名をスコープごとのループにハードコードしています — 新しいスコープはそのリストが拡張されるまで実行されません。同じ PR の一部として、新しいスコープをそのループに追加してください。

## ステージの追加

ステージは、`packages/framework/core/amadeus-common/stages/<phase>/<slug>.md` 配下の、YAML フロントマターを持つ Markdown ファイルとして作成されます。コンパイラはフロントマターを `tools/data/stage-graph.json` に読み込み、ランナージェネレーターはコンパイル済みのステージリストからタイプ可能な `/amadeus-<slug>` skill を出力します。拡張性の契約は「ステージを追加するには、ステージファイルを書く」です — エンジンはコンパイル済みグラフからルーティングするため、登録にエンジンの編集は不要です。(完全なフィールドリファレンスと 3 コンパートメントの本文フォーマットは、ハーネスエンジニアガイドの [Anatomy of a Stage](../harness-engineering/01-anatomy-of-a-stage.ja.md) と [Adding a Stage](../harness-engineering/02-adding-a-stage.ja.md) に存在します。スキーマは [Stage Definition](15-stage-definition.ja.md) です。)

### 手順

1. **ステージファイルを書く** — `packages/framework/core/amadeus-common/stages/<phase>/<slug>.md` を作成します。フロントマターは `slug`、`phase`、`execution`/`condition`、`lead_agent` と任意の `support_agents`(エージェント slug で)、`mode`(`inline` または `subagent`)、`consumes` / `produces`(成果物ボキャブラリの名前)、`requires_stage`(順序付けのエッジ)、`scopes:` メンバーシップリスト、バインドする任意の `sensors:`、そして Unit ごとに反復する場合は `for_each` を宣言します。本文はステージの 3 コンパートメントを担います。完全なフィールド契約については [Stage Definition](15-stage-definition.ja.md) を参照してください。

2. **グラフを再コンパイルする** — `bun .claude/tools/amadeus-graph.ts compile` が新しいフロントマターを `tools/data/stage-graph.json` に読み込み、`scopes:` タグを `tools/data/scope-grid.json` に転置します。`bun .claude/tools/amadeus-graph.ts compile --check` を実行して終了コード 0(ドリフトなし)を確認します。ステージは `bun .claude/tools/amadeus-orchestrate.ts next --stage <slug> --single` で直ちに実行可能です。

3. **ランナーを再生成する** — `bun .claude/tools/amadeus-runner-gen.ts write` が実行可能なコンパイル済みステージごとに `/amadeus-<slug>` ランナー skill を出力するため、新しいステージは手書きなしでタイプ可能なコマンドを得ます。`bun .claude/tools/amadeus-runner-gen.ts check` を実行して、ディスク上のランナーセットがコンパイル済みステージセットと一致することを確認します(ドリフトガード。ブートストラップの initialization ステージは設計上除外されます)。

4. **ステージがルーティングされることを確認する** — そのステージを含むスコープのワークフローに対して `bun .claude/tools/amadeus-orchestrate.ts next` を実行し、エンジンが解決済みの `lead_agent`、gate、`consumes`、`produces` とともに、あなたの slug を指名する `run-stage` ディレクティブを発行することを確認します。

5. **スコープ対応・ステージ対応のドキュメントを更新する** — 新しいステージはステージ数とスコープごとのプランを変更します。`docs/reference/16-artifact-vocabulary.md`(非 initialisation ステージ数)、ハーネスエンジニアガイドのステージ各章、およびプランを列挙するすべてのスコープリファレンスを更新します。この章の末尾のドキュメントポリシーに従い、同じ PR で行ってください。

6. **テストを追加してカバレッジをリフレッシュする** — ステージの振る舞いのための `t*.test.ts` を作成します(スイートは検出方式なので、正しいレベルディレクトリの下にファイルを置くだけでランナーには十分です — 追加するレジストリの行はありません)。次に `bun tests/gen-coverage-registry.ts` でカバレッジインデックスを再生成し、`bun tests/gen-coverage-registry.ts --check` がクリーンであることを確認します。ステージランナーのドリフトガード `tests/unit/t129-stage-runner-drift.test.ts` は、生成されたランナーセットがコンパイル済みステージセットと等しいことをアサートし、`tests/integration/t55-test-suite-drift.test.ts` は古いパスとマーカーをスイープします。

### 自動的に検証されるもの

- **グラフ配置。** `compile` すると、ステージのエッジ(`requires_stage`、`consumes`、`produces`)が解決・順序付けされます。`compile --check` は、ディスク上の `stage-graph.json` がフロントマターからドリフトした場合にビルドを失敗させます。
- **スキーマ + 参照。** `amadeus-graph.ts compile` は `amadeus-stage-schema.ts` を通じて各ステージのフロントマターを検証し、`/amadeus --doctor` は `validateStageFrontmatter` に加えて、すべての `lead_agent` / `support_agents` / `consumes` slug が解決されることを確認する「Graph references」チェックを再実行します。
- **ランナーの整合性。** `amadeus-runner-gen.ts check`(および `t129`)は、コンパイル済みステージにランナーがない、または存在しないステージのランナーが存在する場合に失敗します。

### 自動的には検証されないもの

- **コンパイラが認識しない新しいフロントマターキー。** スキーマが実装していないキーを求めることはフレームワークの変更です: それはデータを読むコードを編集するため、このレシピではなくエンジン/コンパイルパイプラインの経路をたどります。[Stage Definition](15-stage-definition.ja.md) の予約キー名前空間は、将来の構造的拡張が予測可能に着地するために存在します。
- **ドキュメントの列挙。** `docs/` にまたがるステージ数とスコープごとのプランテーブルは手で保守されます。同じ PR で更新してください(以下のドキュメントポリシーを参照)。

## エージェントの追加

エージェントのメタデータ(表示名、サンプルナレッジファイル)は、`packages/framework/core/agents/` 配下の各エージェントの `.md` フロントマターから読み取られます。`packages/framework/core/tools/amadeus-lib.ts` の `loadAgents()` ヘルパーは、そのディレクトリ内のすべての `.md` ファイルを検出し、ステータスラインフックが(表示名をレンダリングするために)消費するメタデータマップを導出します。エージェントの追加に TypeScript の編集は不要です。

### 手順

1. **エージェントファイルを作成する** — 必須のフロントマターを持つ新しい `packages/framework/core/agents/<slug>-agent.md` を置きます:

   ```yaml
   ---
   name: <slug>-agent
   display_name: <Human-Readable Name>
   examples:
     - example-knowledge-file-one.md
     - example-knowledge-file-two.md
   description: >
     One-paragraph description of the agent's responsibilities and which stages it leads or supports.
   disallowedTools: Task
   model: opus
   ---
   ```

   `name` フィールドはファイル名のステムと正確に一致しなければなりません。`display_name` はステータスラインが使用する、人間向けのラベルです。`examples` はエージェント→examples テーブルにドキュメント化された、推奨ナレッジファイル名を列挙します — これらはユーザーへの提案であり、実行時にロードされず、ディスクにも書き込まれません。

2. **エージェントが検出されることを確認する** — `bun -e "import { loadAgents } from 'packages/framework/core/tools/amadeus-lib.ts'; console.log(loadAgents().find(a => a.slug === '<slug>-agent'));"` が新しいエージェントのメタデータを出力するはずです。

3. **intent birth が space ナレッジディレクトリを作成することを確認する** — `bun packages/framework/core/tools/amadeus-utility.ts intent-birth --scope poc --project-dir /tmp/agent-smoke` が空の space レベル `amadeus/knowledge/` ディレクトリ(space の `intents/` の兄弟)を作成するはずです。birth はエージェントごとのサブディレクトリや README をシードしません — チームがコンテンツを持つときに自分で `amadeus/knowledge/<slug>-agent/` を作成します。

4. **ステータスラインがレンダリングされることを確認する** — `Active Agent: <slug>-agent` を持つ state ファイルをシードし、ステータスラインフックを呼び出します。出力は `--` セパレータの後に表示名を含むはずです。

5. **エージェントをステージに組み込む** — ステージをリードまたはサポートすべき新しいエージェントは、`packages/framework/core/amadeus-common/stages/<phase>/` 配下のステージ `.md` ファイルの `lead_agent` / `support_agents` フィールドで、各ステージのフロントマターに指名されます。次に `bun .claude/tools/amadeus-graph.ts compile`(およびドリフトガードとしての `compile --check`)を実行して、そのフロントマターから `tools/data/stage-graph.json` を再生成します。`stage-graph.json` を手編集してはいけません — それはコンパイル済みの成果物であり、次の `compile` が手動の変更を上書きします。これは検出とは別です — `loadAgents()` はエージェントを可視にし、ステージフロントマター(グラフにコンパイルされる)はエージェントをアクティブにします。

### 自動的に検証されるもの

- `loadAgents()` は次回呼び出し時に `.claude/agents/` 内の任意の新しい `.md` ファイルを検出します — コード編集は不要です。
- `name` または `display_name` が欠落している場合、パーサはファイルと欠落フィールドを指名して例外をスローします。
- エージェントは slug のアルファベット順でソートされて返されるため、どのプラットフォームでも `readdirSync` の順序は同じ出力を生成します。
- intent birth は空の space レベル `amadeus/knowledge/` ディレクトリを作成します(エージェントごとのサブディレクトリや README はシードしません)。
- ステータスラインのレンダリングは、同じメタデータソースから表示名を導出します。
- `tests/unit/t61.test.ts` は、フィクスチャエージェントに対して 5 つの特性すべてをエンドツーエンドでアサートします。

### 自動的には検証されないもの

- **ステージグラフへの参加**。ステージフロントマターは `lead_agent` / `support_agents` フィールドで slug によりエージェントを参照し、`amadeus-graph.ts compile` がそれらを `stage-graph.json` に取り込みます。新しいエージェントを追加してもどのステージのフロントマターでも指名しなければ、エージェントは存在するが決して実行されません。ステージグラフのスキーマ検証(`packages/framework/core/tools/amadeus-stage-schema.ts`)が組み込まれています: `amadeus-graph.ts compile` は各ステージのフロントマターを検証し(`compile --check` が CI のドリフトガード)、`/amadeus --doctor` は同じ `validateStageFrontmatter` に加えて、すべての `lead_agent` / `support_agents` slug が解決されることを確認する「Graph references」チェックを再実行します。
- **ナレッジファイルの存在**。`examples` はエージェント→examples テーブルにドキュメント化された、推奨ファイル名のリストです — 作成も検証もされません。ユーザーは実際のコンテンツを `amadeus/knowledge/<agent>/`(space レベルのナレッジディレクトリ)に置きます。
- **エージェントを列挙するドキュメントテーブル**。`docs/reference/05-agent-system.md:119-131` の Phase Participation マトリクスと、`packages/framework/core/knowledge/amadeus-shared/knowledge-readme-template.md:16-29` のエージェント→examples テーブルは手で保守されます。エージェントを追加する同じ PR で更新してください(以下のドキュメントポリシーを参照)。
- **`.claude/agents/<new-agent>.md` の本文コンテンツ**。パースされるのはフロントマターだけです。本文のプロース(Core Responsibilities、Knowledge Loading シーケンスなど)は、アクティブ化されたときにエージェント自身が読み取ります — 他のエージェントファイルの構造に合わせて書いてください。

## プラグイン import-closure guard

`scripts/import-closure-guard.ts` は、manifest 検査が構造的に見ることのできない欠陥クラスに対するパッケージャ側の答えです。manifest 検査が検証するのは `plugin.json` が**宣言した**ファイルであり、宣言済みツールから相対 import で到達可能なのに自身は未宣言、というモジュールについては何も言いません。そうしたモジュールは作業ツリーには存在し compose 後のホストには存在しないため、プラグインは書かれた場所では動き、インストールされた場所で壊れます。

guard は宣言済みツールを起点に相対 import の推移閉包を辿り、各メンバーが二重に被覆されていることを要求します。すなわち、composition がコピーできるよう manifest に宣言されていること、そして宣言に対応する実体があるようプラグインの所有ソースに実在することです。両方の差分は最初の1件で打ち切らず全数列挙されるため、1回のビルド失敗が修復すべき集合全体を示します。

**責務分割。** guard モジュールは純粋です。import specifier の POSIX 正規化とリポジトリルート境界の判断を担い、ファイルシステムへは注入された `readFile` シーム経由でのみ到達します。symlink を実体へ解決すること — 文字列正規化器には見えない escape — は具象アダプタ、すなわち `scripts/plugin-projection.ts` の `repoFileReader` の責務であり、realpath がリポジトリルートの外へ出る参照には `null` を返します。したがって不在・読取不能・escape の各参照はいずれも閉包を無言で縮めるのではなく、guard の `unreadable` 列挙へ落ちます。

**fail-closed。** allowlist・skip リスト・例外ハッチはありません。閉包内のモジュールは宣言され所有されることによってのみ通り、解決不能な参照は failure であって無言の省略ではありません。この性質は維持してください — ここに例外ハッチを開けることは、guard が塞ぐために存在するまさにその盲点を再び開くことです。

**結線。** 公開シームは `assertPluginImportClosure`(`scripts/plugin-projection.ts`)です。`scripts/package.ts` は `guardPluginClosureForCli` 経由でこれを呼び、`PluginValidationError` を診断出力と非0終了へ写して、例外が CLI から漏れる代わりにビルドが失敗するようにしています。

**テスト。** 2つの半分と本番結線を4ファイルが覆います。

```bash
bun test tests/unit/t440-import-closure-resolve.test.ts \
         tests/unit/t441-import-closure-manifest.test.ts \
         tests/integration/t442-plugin-import-closure.integration.test.ts \
         tests/integration/t443-import-closure-symlink-escape.integration.test.ts
```

`t440` は注入されたインメモリ FS に対して再帰走査(`resolveImportClosure`)を駆動し、`t441` は被覆検査と診断レンダリング(`checkManifestClosure`・`describeClosureFailure`)を駆動し、`t442` は `assertPluginImportClosure` を通した本番結線を assert し、`t443` は責務分割のファイルシステム側 — 純粋層には見えない symlink escape — を覆います。guard を拡張するときは対応する側を拡張してください。新しい判断は純粋モジュールへ unit テスト付きで、新しいファイルシステム escape はアダプタへ integration テスト付きで置きます。

## no-silent-drop 採用エビデンスの再束縛

no-silent-drop の採用エビデンスバンドルは、「特定の1リビジョンで gate を実行した」という事実を証明します。したがって `t413-no-silent-drop-ci-adoption.test.ts` は、その束縛以降に gate **自身の実装**が動いていると赤になります:

- `tests/no-silent-drop/**/*.ts`
- `tests/no-silent-drop-gate.ts`

この集合は `tests/no-silent-drop/evidence-rebind.ts` の `EVIDENCE_FRESHNESS_PATHSPECS` として1箇所だけで定義されます。reconcile アダプタも同じ定数を import するため、CI の assertion と main ブランチ上の自動 reconcile が乖離することはありません。gate が**走査する**コーパス(`packages/framework/core/tools`)は意図的に除外しています — 通常の機能開発で変化する対象であり、その都度バンドルを再採用する要求はバンドル側が満たせないためです。

**PR がこれらのパスに触れる場合は、ブランチ内で再束縛してください** — main ブランチの reconcile ワークフローは identity 再束縛しか行わないため、実装変更を代わりに吸収することはできません。最後の実装コミットの後に次を実行します:

```bash
bun scripts/no-silent-drop-evidence.ts rebind --target-revision "$(git rev-parse HEAD)"
```

このコマンドはローカルブランチに接続されたクリーンな worktree を要求し、次の3ファイルだけを書き換えます:

- `tests/no-silent-drop/adoption-evidence.json`
- `tests/no-silent-drop/adoption-evidence-manifest.json`
- `tests/no-silent-drop/evidence/adoption-runs.json`

この3ファイルをコミットし、`bun test tests/integration/t413-no-silent-drop-ci-adoption.test.ts` を再実行してください。その後さらに実装コミットを積んだ場合は、新しい head に対して再度再束縛します — 束縛はレビュアーにマージを依頼する対象の祖先であり、かつ最新でなければなりません。

## ドキュメントポリシー

ファイル、ディレクトリ、コマンド、フラグを追加・削除・リネームする際:

1. `docs/` と `README.md` を grep して古い参照を探す
2. すべての参照を同じコミットで更新する

## 変更の提出

1. 何がなぜ変わったかを明確に説明した PR を `main` に対して開く
2. L1 テストが通ることを確認する: `bash tests/run-tests.sh`
3. フック変更の場合: `bash tests/run-tests.sh --unit` を実行する
4. 統合テストの場合: `bash tests/run-tests.sh --integration` を実行する(`claude` CLI ツールが必要)
5. 変更がファイル、コマンド、フラグに影響する場合はドキュメントを更新する(上記のドキュメントポリシーを参照)
