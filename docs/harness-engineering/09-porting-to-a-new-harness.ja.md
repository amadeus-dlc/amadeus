# AI-DLC を新しいハーネスへ移植する

AI-DLC は **1つのコア、多数のハーネス** から出荷されます — 今日では Claude Code、Kiro CLI、Kiro IDE、Codex CLI で、その集合はオープンです。手で執筆されるソースは、ハーネス中立の `core/` に加えて、CLI ごとの薄い `harness/<name>/` 面です。パッケージャ(`scripts/package.ts`)が、コミットされた各 `dist/<harness>/` ツリーを再生成します。もう1つハーネスを追加するのは **1つのディレクトリと1つのマニフェスト行** です — エンジン、方法論、ハーネスディレクトリ/ルールの解決は `core/` の編集を一切要しません。唯一のオプションの例外は、ハーネスごとの `--doctor` アーム(Step 2 参照)です。このページはその契約を歩きます。

> このリポジトリにおける「harness」の3つの意味: **`harness/`**(トップレベル — このページが扱う CLI ごとの配布面)、**`docs/harness-engineering/`**(このガイド)、そして **`tests/harness/`**(テストスイートのヘルパーライブラリ)。互いに無関係で、配布物なのは最初のものだけです。

## 形状

```
core/                      # ハーネス中立のソース — ハーネス追加のために編集しない(オプションの --doctor アームを除く)
harness/
  claude/  manifest.ts · skills/amadeus/ · CLAUDE.md · settings.json
  kiro/    manifest.ts · skills/amadeus/ · agents/*.json · hooks/amadeus-kiro-adapter.ts · settings/cli.json · AGENTS.md
  codex/   manifest.ts · emit.ts · skills/amadeus/ · hooks/amadeus-codex-adapter.ts
scripts/
  package.ts               # bun scripts/package.ts [<name>] [--check]
  manifest-types.ts        # すべてのマニフェストが実装する HarnessManifest 契約
dist/<name>/               # 生成・コミット・ドリフトガード対象
```

`core/` の散文は `{{HARNESS_DIR}}` トークンでハーネスディレクトリを名指しします。パッケージャはマニフェストが宣言する `harnessDir`(`.claude` / `.kiro` / `.codex` / あなたの `.foo`)に何であれ置換します。`.ts` は変換されずバイトコピーされます — `core/tools/amadeus-lib.ts` の実行時 `harnessDir()` シームが、出荷されたレイアウトから実行時にディレクトリを導出します(オープンセット: ハードコードされたリストではなく、ツール自身のパスからディレクトリ名を読みます)。したがって同じツールのソースがすべてのツリーで実行されます。受け入れゲートは **バイト同一性** です: ハーネスを再生成すると、そのコミット済み dist を正確に再現しなければなりません(`package.ts --check`)。

パッケージャは `harness/` をスキャンして `manifest.ts` を探すことでハーネスを **発見** します。したがって新しいディレクトリは、パッケージャ自体を編集することなく、デフォルトの `bun scripts/package.ts` と `--check` によってビルドされます — 「1つのディレクトリと1つのマニフェスト行、共有コードの編集はゼロ」の文字通りの意味です。

## Step 1 — マニフェスト(宣言的な80%)

`HarnessManifest`(`scripts/manifest-types.ts`)をエクスポートする `harness/<name>/manifest.ts` を作成します。フィールド:

- `name` / `harnessDir` — トークンが置換される先のディレクトリ(例: `.foo`)。
- `coreDirs: DirMap[]` — どの `core/<src>` ディレクトリが `<harnessDir>/<dst>` に射影されるか。ここでディレクトリをリネームまたはドロップします(Kiro は `rules → steering`、Codex は `rules → amadeus-rules` で `skills/` をドロップ — emit 参照)。4つのセッションスキルは in-tree ハーネス(claude、kiro)のコアディレクトリです。codex は代わりにそれらを emit します。
- `harnessFiles: FileMap[]` — `harness/<name>/<src>` から dist にそのままコピーされる、執筆された面(`.md` はトークン置換を受けます)。`projectRoot: true` はファイルをハーネスディレクトリの隣に配置します(例: `AGENTS.md`)。
- `frontmatterAdditions`(オプション)— 射影中にコア射影された `.md` のフロントマターに追記される、ファイルごとの YAML 行。他のハーネスに出荷してはならないハーネス固有(NATIVE)のフィールド向けです(kiro-ide は委任先のエージェントファイルに `tools: ["read", "write", "shell"]` を注入します — IDE はサブエージェントのツール付与を `.md` フロントマターから読みます)。コアを単一ソースに保つためマニフェストデータとして宣言されます。パッケージャは、タイプミスしたパス、欠落したフロントマターブロック、コアがすでに宣言しているキーに対してエラーを出します。
- `rulesRename` — リネームされたルールディレクトリ(`"steering"` | `"amadeus-rules"` | `null`)。パッケージャはこれを、コピーされたディレクトリに、そして散文中の `<harnessDir>/rules/` 参照に、そしてコンパイル済みステージグラフのルールパスに適用します(コンパイル時に `AMADEUS_RULES_DIR` を設定するので `loadRules` がリネームされたディレクトリを見つけます)。さらに、実行時 `rulesSubdir()` シームが読む、生成された `tools/data/harness.json` にそれを emit します — したがって実際のインストールはハードコードされたマップなしにリネームされたディレクトリを解決します。これが `rulesRename` を純粋なマニフェストデータにするシームです: ここで設定すれば、すべての層(ビルド散文、コンパイル済みパス、ランタイム)が `core/` の編集なしに従います。
- `authoredExempt: RegExp[]` — コアコピーされたディレクトリの内側にあるが、生成ではなく執筆されたファイル(orphan スキャンをスキップ)。例: `^hooks/amadeus-<name>-adapter\.ts$`。
- `skipRunnerGen` — ハーネスが `<harnessDir>/skills/` を出荷しないときに設定します(Codex は `emit` 経由でスキルツリーを `.agents/skills/` に emit します)。パッケージャはその場合、標準の runner-gen ステップをスキップします。
- `emit` — オプションのプラグイン(Step 3)、必要としないハーネスには `null`。

Claude のマニフェストは最小限のリファレンスです(リネームなし、emit なし)。Kiro のものはリネーム + `harnessFiles`(エージェント JSON、アダプタ、プロジェクトルートの AGENTS.md)を追加します。

## Step 2 — フックアダプタ(ハーネスごとのシム)

コアフックは Claude 形状の stdin を正規形として消費します。新しいハーネスは **1つの執筆されたアダプタ**(`harness/<name>/hooks/amadeus-<name>-adapter.ts`、`harnessFiles` + `authoredExempt` に列挙)を出荷し、それがハーネスのフックペイロードをその契約に正規化し、共有コアフックへサブプロセスパイプします。コアフックをロジック + アダプタに分割しないでください — コア本体はすべてのハーネスでバイト共有されたまま保たれます(`--check` がそれを証明します: dist 内のすべての `.ts` はその `core/` ソースとバイト同一です)。

アダプタをハーネスのイベントにハーネス独自の方法で配線します: Kiro は `agents/amadeus.json` にターゲットを登録し、Codex は `hooks.json` を emit します。実際のコアフック消費者を持つイベントだけを登録してください。

> **唯一の是認された `core/` 編集: doctor アーム。** `/amadeus --doctor`(`core/tools/amadeus-utility.ts`)はインストール済みツリーをヘルスチェックし、新しいハーネスはそこに自身のインストール面向けのハーネスごとのアーム(アダプタ + 配線ファイルの存在、任意のバイナリバージョン下限)を追加します。これは意図的なハーネスごとの *ロジック* であり、データではありません — バージョンチェックは CLI を spawn して semver を比較しますが、これはどのマニフェスト行でも表現できません(three-concerns ルール: 知識はコードに存在する)— したがってこれは「`core/` 編集ゼロ」への祝福された例外であり、違反ではありません(意図的な設計上のトレードオフ)。それは優雅に劣化します: アームのないハーネスは失敗するのではなく、単に汎用チェックを得ます。それ以外のすべて — ディレクトリ解決、ルールディレクトリのリネーム、パッケージング — は純粋なマニフェストデータのままです。

## Step 3 — `emit.ts`(命令的な20%、必要な場合のみ)

宣言的な行では表現できない構造的な相違は `emit.ts` です — マニフェストが参照するプラグインで、パッケージャが `EmitContext`(`coreRoot`、`harnessRoot`、`distRoot`、`harnessDir`、`substituteToken`、`check`)とともに呼び出し、それが書いたパスを返します。Codex のものが実例です: `config.toml`、`hooks.json`、フック信頼の事前シード、`AGENTS.md` のマージ、エージェント TOML の転置、そして `.agents/skills/` ツリー(`core/tools/amadeus-runner-gen.ts` がエクスポートするレンダー関数から `AMADEUS_HARNESS_DIR` の下で構成され、決して再実装されない)。面がすべて執筆されたファイルであるハーネス(Claude、Kiro)は `emit: null` を設定します。

`emit` は `ctx.check` を尊重します: `--check` の下では、出力を diff し、書き込む代わりに問題を返します。したがってドリフトガードは `<harnessDir>` の外に存在する emit 所有のファイル(例: `.agents/skills/`、ルートの `AGENTS.md`)をカバーします。

## Step 4 — ただ1つの変換クラス

許される唯一のテキスト変換は、スラッシュアンカーされたハーネスディレクトリファミリーです: `.md` 散文内の `{{HARNESS_DIR}}` → ハーネスディレクトリ、加えてルールディレクトリのリネーム。盲目的な `sed` は禁止です。`core/` にあるハーネス固有の真実のリテラル(`$CLAUDE_PROJECT_DIR` の注記、workspace-detection のハーネスディレクトリ列挙)はトークンを持たず、変換されず通過します — core-hygiene テスト(`t146-core-hygiene`)が新しい生のパスリテラルの混入を防ぎます。

## Step 5 — テストとゲート

- パッケージング同一性テスト(`t145`)が `package.ts --check` を実行します。これはマニフェストを持つすべてのハーネスを自動的にカバーします。
- `<name>` フックアダプタ契約テストが、ライブ捕捉されたペイロードをアダプタに通し、観測可能なコアフックの効果をアサートします。
- ライブジャーニーは `skipReason()`(`AMADEUS_<NAME>_*_LIVE=1` 環境変数 + バイナリの存在 + 認証済み)でゲートされた e2e として出荷され、決定的な層ではクリーンにスキップされ、移植がマージされる前にローカルでグリーンに実行されます。

再生成には `bun scripts/package.ts <name>`、ドリフトガードには `--check`、そしてゲートには決定的なスイート(`bash tests/run-tests.sh --smoke --unit --integration -P 8`)に加えてライブジャーニーを実行してください。

## 次へ

これで弧が閉じます: あなたはデータ面を形づくり(01–08章)、いまコアを新しい CLI にレンダリングしました。ここから:

- 全体マップについては、[ハーネスエンジニアガイド概要](00-overview.md) に戻ってください。
- 新しいハーネスは他のものと並んで **ユーザー向けの章** を得ます — 既存のものがどう読めるかは、User Guide の [Running on other harnesses](../guide/harnesses/README.md) ファミリーを参照してください。
- 規範的なビルド契約(マニフェスト型、`emit` プラグイン API、`harnessDir()` シーム)は Developer Reference の [Architecture § Source vs distribution](../reference/01-architecture.md#source-vs-distribution-one-core-many-harnesses) に存在します。
