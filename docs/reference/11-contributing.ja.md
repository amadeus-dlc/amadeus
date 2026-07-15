# コントリビューション

> 言語: [English](11-contributing.md) | **日本語**

## 概要

この実装へのコントリビューションを歓迎します。このガイドでは、前提条件、開発ワークフロー、テスト、そして変更を提出する方法を扱います。

> **パス規約。** 以下の `<record>/` = 誕生した intent の record ディレクトリ、
> `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/` — intent ごとの state、監査
> シャード、ナレッジ、成果物が置かれる場所です。

## 前提条件

- **Claude Code** -- ネイティブインストール(推奨、自動更新)。macOS/Linux/WSL は `curl -fsSL https://claude.ai/install.sh | bash`、Windows PowerShell は `irm https://claude.ai/install.ps1 | iex`。あるいは `brew install --cask claude-code`。([Claude Code docs](https://code.claude.com/docs/en/quickstart) を参照)
- **bun** -- すべての CLI ツールと 11 個すべてのフックに必須。`curl -fsSL https://bun.sh/install | bash` でインストールします。Windows では `npm install -g bun` または `powershell -c "irm bun.sh/install.ps1 | iex"`。非対話シェルの PATH に含まれている必要があります(zsh は `~/.zshenv`、bash / Windows の Git Bash は `~/.bashrc`)。
- **timeout**(GNU coreutils)-- テストスイートが LLM テストのタイムアウト(L2/L3)に使用するため必須。Linux にはプリインストールされています。macOS では `brew install coreutils` の後、gnubin を PATH に追加します: `export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"`(`~/.zshenv` または `~/.zshrc` に記述)。
- **Bash** -- POSIX 互換ラッパー(`tests/run-tests.sh`)向けの任意項目。主要なテストランナーは `bun tests/run-tests.ts` です。実行時には、配布可能なフックのいずれも Bash を必要としません。
- **ライブなモデルプロバイダアクセス** -- ライブの統合テストと e2e テスト(L2/L3)の実行に必須。L1 プロトコルテストには不要です。

## リポジトリ構造

```
core/                # 手書きの、ハーネス中立なソース(tools, stages, agents, rules, knowledge, hooks)
harness/<name>/      # ハーネスごとに書かれた表層(manifest、オーケストレーター skill、settings/config; 例 claude/, kiro/, codex/)
scripts/package.ts   # ビルド: core/ + harness/ から dist/<harness>/ を再生成(`bun run dist`、`--check` でドリフトガード)
scripts/promote-self.ts # プロジェクトローカルのドッグフーディングインストール: 生成された Claude/Codex 表層を .claude/.codex/.agents に昇格(ワークスペースの memory は決して上書きしない)
dist/<harness>/      # 生成された配布物(claude/.claude/, kiro/.kiro/ + AGENTS.md, codex/)— 手編集禁止。packager を実行すること
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
3. **エントリポイントを理解する** -- 決定論的エンジン `core/tools/amadeus-orchestrate.ts`(`next` / `report`)がルーティングを所有し、コンダクター `harness/claude/skills/amadeus/SKILL.md` はそのディレクティブに従って動作する薄い転送ループです。正となるエンジン / ディレクティブ / コンダクター / swarm の契約については [The Skill System](17-skill-system.ja.md) を参照してください
4. **変更を加える** -- `core/` のハーネス中立ソース(tools, stages, agents, hooks, rules, knowledge)、または `harness/<name>/` のハーネス表層(オーケストレーター skill、settings)を編集します。その後 `bun run dist` を実行して `dist/` を再生成します — `dist/` を手編集してはいけません。ドリフトガード(`bun run dist:check` / `package.ts --check`)が CI を失敗させます
5. **ドッグフーディング時はローカルに昇格する** -- `bun run promote:self` を実行して、生成されたハーネス出力からこのリポジトリのプロジェクトローカルな `.claude/`、`.codex/`、`.agents/`、`CLAUDE.md` をリフレッシュします。`bun run promote:self:check` がそのセルフインストールをドリフトガードします。`amadeus/spaces/default/memory/` は意図的に昇格されません — ワークスペースの memory は手編集される method ソース(practices-discovery と自己学習ループが実行時に書き込む)であり、promoter は決して上書きしません。composed-scope のランタイムデータも同様に保護されます: dist に存在しない `scopes/amadeus-<name>.md` は composer が作成した scope(保持され、orphan として削除されない)であり、`tools/data/scope-grid.json` はキーごとに比較・書き込みされるため、composed なエントリは残りつつ stock エントリのドリフトは引き続きチェックを失敗させます
6. **テスト** -- 提出前に `bun tests/run-tests.ts` を実行します
7. **提出** -- `main` に対して PR を開きます

## テスト

このスイートは完全に TypeScript(`t*.test.ts`、`bun` で実行)で、4 つのレベル — `smoke`、`unit`、`integration`、`e2e` — にわたり、3 層ピラミッド(smoke + unit = L1 Protocol、integration = L2 Stage、e2e = L3 Acceptance)にマッピングされます。L1 は依存関係なしでローカル実行されます。ライブの統合テストと e2e ファイルは、該当する CLI ツールと動作するモデルプロバイダの認証情報を必要とし、その基盤が存在しない場合はクリーンにスキップします。

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
```

完全なテスト戦略、スタブ、新しいテストの追加方法については [reference/09-testing.md](09-testing.ja.md) を参照してください。

## ユーティリティハンドラの追加

> **監査イベントを追加する前に**、[State Machine](12-state-machine.ja.md) を読んでください。この章はタクソノミー内のすべてのイベント、その発行元、そして「同一コミットルール」を列挙しています — コードと章のテーブルを同じ PR で更新してください。さもないとドリフトテストが失敗します。

ユーティリティハンドラは 2 つのカテゴリに分かれます。

### 決定論的ハンドラ(推奨)
LLM 推論を必要としないハンドラ(テキストの出力、ファイルの読み取り/整形、前提条件のチェック、ディレクトリの作成)向け:
1. `core/tools/amadeus-utility.ts` にサブコマンドを追加する
2. SKILL.md から単一の Bash 呼び出しでディスパッチする: `bun .claude/tools/amadeus-utility.ts <subcommand>`
3. タスクトラッキングは不要 -- スクリプトは 1 秒未満で実行される
4. 監査ログはスクリプト内で `amadeus-audit.ts` の `appendAuditEntry` を通じて処理する(`**Event**:` の markdown ブロックを手書きしない)

`--help`、`--version`、`--status`、`--doctor` ハンドラはリファレンス実装です。

`codekb-path` ハンドラは読み取り専用の **クエリ動詞**(`intent <name>` や `space` と同様)です: ステージのプロースからディスパッチされ、監査イベントを発行せず、SKILL.md のタスクトラッキングを駆動せず、ディレクトリを作成しません(`mkdir`)。reverse-engineering ステージが成果物を書き込む、リポジトリごとの正規 codekb ディレクトリを単に出力するだけです。これによりプロースがそのパスを手で導出することがなくなります。

### LLM 駆動ハンドラ
エージェントの推論から恩恵を受けるハンドラ(ファイルシステムのスキャン、意思決定)向け:
1. **タスクトラッキング** -- 論理ステップごとに `TaskCreate` でタスクを作成し、作業の進行に応じて `TaskUpdate`(`in_progress` -> `completed`)で遷移させます。これが Claude Code のタスクサイドバーを駆動します。
2. **ステータスラインの更新** -- アクティブな intent の `amadeus-state.md` が存在する場合、`Current Stage` を一時的に、実行中のユーティリティを表す値(例: `running health check`)に設定し、完了時に元の値を復元します。`amadeus-statusline.ts` フックがこのフィールドをターミナルのステータスバーのために読み取ります。
3. **監査ログ** -- 適切なツールのサブコマンドを呼び出します(例: 内部で `appendAuditEntry` を呼ぶ `bun .claude/tools/amadeus-utility.ts <handler>`)。LLM のプロースから `**Event**:` の markdown ブロックを手書きしてはいけません — [State Machine: Forbidden patterns](12-state-machine.ja.md) を参照してください。

`intent-birth` ハンドラは完全に決定論的です: 3 つの init ステージ(workspace-scaffold、workspace-detection、state-init)すべてが単一の `amadeus-utility intent-birth` 呼び出しの中で実行されます。ウェルカムメッセージはセッション開始時に `settings.json` の `companyAnnouncements` を通じてレンダリングされ、ステージではありません。

## スコープの追加

スコープはファイル(その identity)とステージごとのメンバーシップタグとして作成されます。identity は `core/scopes/amadeus-<name>.md` に存在し、メンバーシップは `core/amadeus-common/stages/` 配下の各ステージのフロントマター `scopes:` リストに存在します。`init`、`scope-change`、`resolve-env-scope`、`doctor`、および state ツールにまたがる検証ロジックは、実行時に `core/tools/amadeus-lib.ts` の `validScopes()` を通じて `.claude/scopes/*.md` ファイルから有効なスコープのリストを導出します。EXECUTE/SKIP グリッドはステージごとの `scopes:` リストの転置であり、`tools/data/scope-grid.json` にコンパイルされます。スコープの追加に TypeScript の編集は不要です。

### 手順

1. **`core/scopes/amadeus-hotfix.md` を作成する** — スコープの identity です。フロントマター:
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

2. **メンバーとなるステージにタグを付ける** — `hotfix` で実行すべき各ステージ(`core/amadeus-common/stages/<phase>/` 配下)で、そのフロントマターの `scopes:` リストに `hotfix` を追加します。タグを付けなかったステージはそのスコープでは `SKIP` になります。3 つの initialization ステージ(`workspace-scaffold`、`workspace-detection`、`state-init`)は必ず含めなければなりません — 常に実行されるためです。

3. **再コンパイル + スコープテーブルの再生成** — `bun .claude/tools/amadeus-graph.ts compile` が `scopes:` タグを `tools/data/scope-grid.json` に転置します。次に `bun .claude/tools/amadeus-utility.ts scope-table` が正規の Markdown テーブルを出力するので、`harness/claude/skills/amadeus/SKILL.md` の `<!-- BEGIN: compiled ... -->` / `<!-- END: compiled ... -->` マーカーの間に貼り付けます。`bun .claude/tools/amadeus-graph.ts compile --check` と `bun .claude/tools/amadeus-utility.ts scope-table --check` を実行して終了コード 0(ドリフトなし)を確認します。

4. **スコープが解決されることを確認する** — `bun core/tools/amadeus-utility.ts init --scope hotfix --project-dir /tmp/scope-smoke` が成功し、`Scope: hotfix` を持つ state ファイルが生成されるはずです。

5. **`doctor` が env デフォルトとして受け入れることを確認する** — `AMADEUS_DEFAULT_SCOPE=hotfix bun amadeus-utility.ts doctor` が env 変数を有効として報告するはずです。

6. **キーワード推論を確認する**(`keywords` が入力されている場合)— `bun amadeus-utility.ts detect-scope --from-text --input "urgent customer issue" --project-dir /tmp/scope-smoke` が `{"scope":"hotfix","source":"keyword","matches":["urgent"]}` を返すはずです。

7. **プランの整合性を確認する**(任意だが推奨)— `AMADEUS_GRAPH_RESOLVE=1 bun .claude/tools/amadeus-graph.ts resolve hotfix --stdout` がスコープのプランを出力します。EXECUTE セットがタグ付けした内容と一致することを目視で確認してください。

8. **スコープ対応ドキュメントを更新する** — `docs/guide/05-scopes-and-depth.md`(完全なスコープリファレンス)、`docs/guide/13-customization.md`(有効値のリストとスコープテーブル)、`docs/reference/03-orchestrator.md`(スコープからステージへのマッピング)はいずれもスコープを明示的に列挙しています。この章の末尾のドキュメントポリシーに従い、同じ PR で更新してください。

9. **スコープルーティングのワークフローテストを追加する** — スコープが既存のスコープと異なる振る舞い(新しいフェーズスキップパターン、新しい depth の組み合わせ)を持つ場合、`tests/e2e/t53.test.ts`(sdk スコープルーティング)または `tests/e2e/t-tui-t50-bugfix-scope.serial.test.ts`(tui スコープの通し実行)を手本にしたルーティング済みジャーニーテストを追加します。

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

ステージは、`core/amadeus-common/stages/<phase>/<slug>.md` 配下の、YAML フロントマターを持つ Markdown ファイルとして作成されます。コンパイラはフロントマターを `tools/data/stage-graph.json` に読み込み、ランナージェネレーターはコンパイル済みのステージリストからタイプ可能な `/amadeus-<slug>` skill を出力します。拡張性の契約は「ステージを追加するには、ステージファイルを書く」です — エンジンはコンパイル済みグラフからルーティングするため、登録にエンジンの編集は不要です。(完全なフィールドリファレンスと 3 コンパートメントの本文フォーマットは、ハーネスエンジニアガイドの [Anatomy of a Stage](../harness-engineering/01-anatomy-of-a-stage.ja.md) と [Adding a Stage](../harness-engineering/02-adding-a-stage.ja.md) に存在します。スキーマは [Stage Definition](15-stage-definition.ja.md) です。)

### 手順

1. **ステージファイルを書く** — `core/amadeus-common/stages/<phase>/<slug>.md` を作成します。フロントマターは `slug`、`phase`、`execution`/`condition`、`lead_agent` と任意の `support_agents`(エージェント slug で)、`mode`(`inline` または `subagent`)、`consumes` / `produces`(成果物ボキャブラリの名前)、`requires_stage`(順序付けのエッジ)、`scopes:` メンバーシップリスト、バインドする任意の `sensors:`、そして Unit ごとに反復する場合は `for_each` を宣言します。本文はステージの 3 コンパートメントを担います。完全なフィールド契約については [Stage Definition](15-stage-definition.ja.md) を参照してください。

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

エージェントのメタデータ(表示名、サンプルナレッジファイル)は、`core/agents/` 配下の各エージェントの `.md` フロントマターから読み取られます。`core/tools/amadeus-lib.ts` の `loadAgents()` ヘルパーは、そのディレクトリ内のすべての `.md` ファイルを検出し、ステータスラインフックが(表示名をレンダリングするために)消費するメタデータマップを導出します。エージェントの追加に TypeScript の編集は不要です。

### 手順

1. **エージェントファイルを作成する** — 必須のフロントマターを持つ新しい `core/agents/<slug>-agent.md` を置きます:

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

2. **エージェントが検出されることを確認する** — `bun -e "import { loadAgents } from 'core/tools/amadeus-lib.ts'; console.log(loadAgents().find(a => a.slug === '<slug>-agent'));"` が新しいエージェントのメタデータを出力するはずです。

3. **intent birth が space ナレッジディレクトリを作成することを確認する** — `bun core/tools/amadeus-utility.ts intent-birth --scope poc --project-dir /tmp/agent-smoke` が空の space レベル `amadeus/knowledge/` ディレクトリ(space の `intents/` の兄弟)を作成するはずです。birth はエージェントごとのサブディレクトリや README をシードしません — チームがコンテンツを持つときに自分で `amadeus/knowledge/<slug>-agent/` を作成します。

4. **ステータスラインがレンダリングされることを確認する** — `Active Agent: <slug>-agent` を持つ state ファイルをシードし、ステータスラインフックを呼び出します。出力は `--` セパレータの後に表示名を含むはずです。

5. **エージェントをステージに組み込む** — ステージをリードまたはサポートすべき新しいエージェントは、`core/amadeus-common/stages/<phase>/` 配下のステージ `.md` ファイルの `lead_agent` / `support_agents` フィールドで、各ステージのフロントマターに指名されます。次に `bun .claude/tools/amadeus-graph.ts compile`(およびドリフトガードとしての `compile --check`)を実行して、そのフロントマターから `tools/data/stage-graph.json` を再生成します。`stage-graph.json` を手編集してはいけません — それはコンパイル済みの成果物であり、次の `compile` が手動の変更を上書きします。これは検出とは別です — `loadAgents()` はエージェントを可視にし、ステージフロントマター(グラフにコンパイルされる)はエージェントをアクティブにします。

### 自動的に検証されるもの

- `loadAgents()` は次回呼び出し時に `.claude/agents/` 内の任意の新しい `.md` ファイルを検出します — コード編集は不要です。
- `name` または `display_name` が欠落している場合、パーサはファイルと欠落フィールドを指名して例外をスローします。
- エージェントは slug のアルファベット順でソートされて返されるため、どのプラットフォームでも `readdirSync` の順序は同じ出力を生成します。
- intent birth は空の space レベル `amadeus/knowledge/` ディレクトリを作成します(エージェントごとのサブディレクトリや README はシードしません)。
- ステータスラインのレンダリングは、同じメタデータソースから表示名を導出します。
- `tests/unit/t61.test.ts` は、フィクスチャエージェントに対して 5 つの特性すべてをエンドツーエンドでアサートします。

### 自動的には検証されないもの

- **ステージグラフへの参加**。ステージフロントマターは `lead_agent` / `support_agents` フィールドで slug によりエージェントを参照し、`amadeus-graph.ts compile` がそれらを `stage-graph.json` に取り込みます。新しいエージェントを追加してもどのステージのフロントマターでも指名しなければ、エージェントは存在するが決して実行されません。ステージグラフのスキーマ検証(`core/tools/amadeus-stage-schema.ts`)が組み込まれています: `amadeus-graph.ts compile` は各ステージのフロントマターを検証し(`compile --check` が CI のドリフトガード)、`/amadeus --doctor` は同じ `validateStageFrontmatter` に加えて、すべての `lead_agent` / `support_agents` slug が解決されることを確認する「Graph references」チェックを再実行します。
- **ナレッジファイルの存在**。`examples` はエージェント→examples テーブルにドキュメント化された、推奨ファイル名のリストです — 作成も検証もされません。ユーザーは実際のコンテンツを `amadeus/knowledge/<agent>/`(space レベルのナレッジディレクトリ)に置きます。
- **エージェントを列挙するドキュメントテーブル**。`docs/reference/05-agent-system.md:119-131` の Phase Participation マトリクスと、`core/knowledge/amadeus-shared/knowledge-readme-template.md:16-29` のエージェント→examples テーブルは手で保守されます。エージェントを追加する同じ PR で更新してください(以下のドキュメントポリシーを参照)。
- **`.claude/agents/<new-agent>.md` の本文コンテンツ**。パースされるのはフロントマターだけです。本文のプロース(Core Responsibilities、Knowledge Loading シーケンスなど)は、アクティブ化されたときにエージェント自身が読み取ります — 他の 11 個のエージェントファイルの構造に合わせて書いてください。

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
