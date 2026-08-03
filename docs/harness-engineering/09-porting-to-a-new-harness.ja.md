# AI-DLC を新しいハーネスへ移植する

> 言語: [English](09-porting-to-a-new-harness.md) | **日本語**

AI-DLC は **1つのコア、多数のハーネス** から出荷されます — 今日では Claude Code、Kiro CLI、Kiro IDE、Codex CLI で、その集合はオープンです。手で執筆されるソースは、ハーネス中立の `packages/framework/core/` に加えて、CLI ごとの薄い `packages/framework/harness/<name>/` 面です。パッケージャ(`scripts/package.ts`)が未追跡のローカル `dist/<harness>/` ツリーを再生成し、release CIがクリーンcheckoutから公開assetを構築します。もう1つハーネスを追加するのは **1つのディレクトリと1つのマニフェスト行** です — エンジン、方法論、ハーネスディレクトリ/ルールの解決は `packages/framework/core/` の編集を一切要しません。唯一のオプションの例外は、ハーネスごとの `--doctor` アーム(Step 2 参照)です。このページはその契約を歩きます。

> このリポジトリにおける「harness」の3つの意味: **`packages/framework/harness/`**(このページが扱う CLI ごとの配布面)、**`docs/harness-engineering/`**(このガイド)、そして **`tests/harness/`**(テストスイートのヘルパーライブラリ)。互いに無関係で、配布物なのは最初のものだけです。

## 形状

```
packages/framework/core/   # ハーネス中立のソース — ハーネス追加のために編集しない(オプションの --doctor アームを除く)
packages/framework/harness/
  claude/  manifest.ts · skills/amadeus/ · CLAUDE.md · settings.json
  kiro/    manifest.ts · skills/amadeus/ · agents/*.json · hooks/amadeus-kiro-adapter.ts · settings/cli.json · AGENTS.md
  codex/   manifest.ts · emit.ts · skills/amadeus/ · hooks/amadeus-codex-adapter.ts
scripts/
  package.ts               # bun scripts/package.ts [<name>]
  manifest-types.ts        # すべてのマニフェストが実装する HarnessManifest 契約
dist/<name>/               # 生成・未追跡のローカル出力
```

`packages/framework/core/` の散文は `{{HARNESS_DIR}}` トークンでハーネスディレクトリを名指しします。パッケージャはマニフェストが宣言する `harnessDir`(`.claude` / `.kiro` / `.codex` / あなたの `.foo`)に何であれ置換します。`.ts` は変換されずバイトコピーされます — `packages/framework/core/tools/amadeus-lib.ts` の実行時 `harnessDir()` シームが、出荷されたレイアウトから実行時にディレクトリを導出します(オープンセット: ハードコードされたリストではなく、ツール自身のパスからディレクトリ名を読みます)。したがって同じツールのソースがすべてのツリーで実行されます。受け入れゲートは **再現性** です: CIは隔離した2つのworkspaceですべてのハーネスを再生成し、結果のbyte同一性を要求します。

パッケージャは `packages/framework/harness/` をスキャンして `manifest.ts` を探すことでハーネスを **発見** します。したがって新しいディレクトリは、パッケージャ自体を編集することなく、デフォルトの `bun scripts/package.ts` によってビルドされます — 「1つのディレクトリと1つのマニフェスト行、共有コードの編集はゼロ」の文字通りの意味です。

## Step 1 — マニフェスト(宣言的な80%)

`HarnessManifest`(`scripts/manifest-types.ts`)をエクスポートする `packages/framework/harness/<name>/manifest.ts` を作成します。フィールド:

- `name` / `harnessDir` — トークンが置換される先のディレクトリ(例: `.foo`)。
- `coreDirs: DirMap[]` — どの `packages/framework/core/<src>` ディレクトリが `<harnessDir>/<dst>` に射影されるか。ここでディレクトリをリネームまたはドロップします(Kiro は `rules → steering`、Codex は `rules → amadeus-rules` で `skills/` をドロップ — emit 参照)。4つのセッションスキルは in-tree ハーネス(claude、kiro)のコアディレクトリです。codex は代わりにそれらを emit します。
- `harnessFiles: FileMap[]` — `packages/framework/harness/<name>/<src>` から dist にそのままコピーされる、執筆された面(`.md` はトークン置換を受けます)。`projectRoot: true` はファイルをハーネスディレクトリの隣に配置します(例: `AGENTS.md`)。
- `frontmatterAdditions`(オプション)— 射影中にコア射影された `.md` のフロントマターに追記される、ファイルごとの YAML 行。他のハーネスに出荷してはならないハーネス固有(NATIVE)のフィールド向けです(kiro-ide は委任先のエージェントファイルに `tools: ["read", "write", "shell"]` を注入します — IDE はサブエージェントのツール付与を `.md` フロントマターから読みます)。コアを単一ソースに保つためマニフェストデータとして宣言されます。パッケージャは、タイプミスしたパス、欠落したフロントマターブロック、コアがすでに宣言しているキーに対してエラーを出します。
- `rulesRename` — リネームされたルールディレクトリ(`"steering"` | `"amadeus-rules"` | `null`)。パッケージャはこれを、コピーされたディレクトリに、そして散文中の `<harnessDir>/rules/` 参照に、そしてコンパイル済みステージグラフのルールパスに適用します(コンパイル時に `AMADEUS_RULES_DIR` を設定するので `loadRules` がリネームされたディレクトリを見つけます)。さらに、実行時 `rulesSubdir()` シームが読む、生成された `tools/data/harness.json` にそれを emit します — したがって実際のインストールはハードコードされたマップなしにリネームされたディレクトリを解決します。これが `rulesRename` を純粋なマニフェストデータにするシームです: ここで設定すれば、すべての層(ビルド散文、コンパイル済みパス、ランタイム)が `packages/framework/core/` の編集なしに従います。
- `authoredExempt: RegExp[]` — コアコピーされたディレクトリの内側にあるが、生成ではなく執筆されたファイル(orphan スキャンをスキップ)。例: `^hooks/amadeus-<name>-adapter\.ts$`。
- `skipRunnerGen` — ハーネスが `<harnessDir>/skills/` を出荷しないときに設定します(Codex は `emit` 経由でスキルツリーを `.agents/skills/` に emit します)。パッケージャはその場合、標準の runner-gen ステップをスキップします。
- `emit` — オプションのプラグイン(Step 3)、必要としないハーネスには `null`。

Claude のマニフェストは最小限のリファレンスです(リネームなし、emit なし)。Kiro のものはリネーム + `harnessFiles`(エージェント JSON、アダプタ、プロジェクトルートの AGENTS.md)を追加します。

## Step 2 — フックアダプタ(ハーネスごとのシム)

コアフックは Claude 形状の stdin を正規形として消費します。新しいハーネスは **1つの執筆されたアダプタ**(`packages/framework/harness/<name>/hooks/amadeus-<name>-adapter.ts`、`harnessFiles` + `authoredExempt` に列挙)を出荷し、それがハーネスのフックペイロードをその契約に正規化し、共有コアフックへサブプロセスパイプします。コアフックをロジック + アダプタに分割しないでください — コア本体はすべてのハーネスでバイト共有されたまま保たれます(core byte-identityテストが、投影されたすべての `.ts` と `packages/framework/core/` ソースの一致を検証します)。

アダプタをハーネスのイベントにハーネス独自の方法で配線します: Kiro は `agents/amadeus.json` にターゲットを登録し、Codex は `hooks.json` を emit します。実際のコアフック消費者を持つイベントだけを登録してください。

> **唯一の是認された `packages/framework/core/` 編集: doctor アーム。** `/amadeus --doctor`(`packages/framework/core/tools/amadeus-utility.ts`)はインストール済みツリーをヘルスチェックし、新しいハーネスはそこに自身のインストール面向けのハーネスごとのアーム(アダプタ + 配線ファイルの存在、任意のバイナリバージョン下限)を追加します。これは意図的なハーネスごとの *ロジック* であり、データではありません — バージョンチェックは CLI を spawn して semver を比較しますが、これはどのマニフェスト行でも表現できません(three-concerns ルール: 知識はコードに存在する)— したがってこれは「`packages/framework/core/` 編集ゼロ」への祝福された例外であり、違反ではありません(意図的な設計上のトレードオフ)。それは優雅に劣化します: アームのないハーネスは失敗するのではなく、単に汎用チェックを得ます。それ以外のすべて — ディレクトリ解決、ルールディレクトリのリネーム、パッケージング — は純粋なマニフェストデータのままです。

## Step 3 — `emit.ts`(命令的な20%、必要な場合のみ)

宣言的な行では表現できない構造的な相違は `emit.ts` です — マニフェストが参照するプラグインで、パッケージャが `EmitContext`(`coreRoot`、`harnessRoot`、`distRoot`、`harnessDir`、`substituteToken`、`check`)とともに呼び出し、それが書いたパスを返します。`check` はAPI互換性のため残っていますが、source-only packagerはwrite modeでemitterを呼び、CIが隔離した出力treeを比較します。Codex のものが実例です: `config.toml`、`hooks.json`、フック信頼の事前シード、`AGENTS.md` のマージ、エージェント TOML の転置、そして `.agents/skills/` ツリー(`packages/framework/core/tools/amadeus-runner-gen.ts` がエクスポートするレンダー関数から `AMADEUS_HARNESS_DIR` の下で構成され、決して再実装されない)。面がすべて執筆されたファイルであるハーネス(Claude、Kiro)は `emit: null` を設定します。

`<harnessDir>` の外に存在するemit所有ファイル(例: `.agents/skills/`、root `AGENTS.md`)も、隔離build比較とsource-only境界検査の対象です。

## Step 4 — ただ1つの変換クラス

許される唯一のテキスト変換は、スラッシュアンカーされたハーネスディレクトリファミリーです: `.md` 散文内の `{{HARNESS_DIR}}` → ハーネスディレクトリ、加えてルールディレクトリのリネーム。盲目的な `sed` は禁止です。`packages/framework/core/` にあるハーネス固有の真実のリテラル(`$CLAUDE_PROJECT_DIR` の注記、workspace-detection のハーネスディレクトリ列挙)はトークンを持たず、変換されず通過します — core-hygiene テスト(`t146-core-hygiene`)が新しい生のパスリテラルの混入を防ぎます。

## Step 5 — テストとゲート

- reproducible-build CI jobが、発見した全manifestを隔離した2つのworkspaceでpackageし、完全な出力をbyte単位で比較します。
- `bun run source-only:check` が、bootstrap/configuration allowlist外の生成ハーネス出力が追跡・stageされた場合に拒否します。
- `<name>` フックアダプタ契約テストが、ライブ捕捉されたペイロードをアダプタに通し、観測可能なコアフックの効果をアサートします。
- ライブジャーニーは `skipReason()`(`AMADEUS_<NAME>_*_LIVE=1` 環境変数 + バイナリの存在 + 認証済み)でゲートされた e2e として出荷され、決定的な層ではクリーンにスキップされ、移植がマージされる前にローカルでグリーンに実行されます。

再生成には `bun scripts/package.ts <name>`、Git境界検査には `bun run source-only:check`、そしてゲートには決定的なスイート(`bash tests/run-tests.sh --smoke --unit --integration -P 8`)に加えてライブジャーニーを実行してください。CIが隔離buildの再現性比較を行います。

## Pi maintenance inventory

Pi は、native resource loading、lifecycle extension、internal child-execution
driver を組み合わせる harness の実例です。minimum runtime は
`@earendil-works/pi-coding-agent` 0.83.0 です。formal-success platform は macOS と
Linux で、native Windows は対象外です。Pi project trust は native ですが sandbox
ではなく、Amadeus component が自動承認したり trust store を変更したりしてはいけません。
extension と Pi Package は host user と同じ権限で動作します。

### Authored resource と生成済み catalog

`packages/framework/harness/pi/manifest.ts` が閉じた source of truth です。現在の resource
inventory は次のとおりです。

| Role | Authored source | Project destination | Loader |
|------|-----------------|---------------------|--------|
| Orchestrator skill | `skills/amadeus/SKILL.md` | `.pi/skills/amadeus/SKILL.md` | Pi `native` |
| Question annex | `skills/amadeus/question-rendering.md` | `.pi/skills/amadeus/question-rendering.md` | Skill `annex` |
| Lifecycle extension | `extensions/amadeus-pi-extension.ts` | `.pi/extensions/amadeus.ts` | Pi `native` |
| Child driver | `drivers/amadeus-pi-driver.ts` | `.pi/drivers/amadeus-pi-driver.ts` | Amadeus `internal` |
| Driver request/RPC contract | `drivers/amadeus-pi-driver-contract.ts` | `.pi/drivers/amadeus-pi-driver-contract.ts` | Amadeus `internal` |
| Process-group guardian | `drivers/amadeus-pi-guardian.ts` | `.pi/drivers/amadeus-pi-guardian.ts` | Amadeus `internal` |
| Replay store | `drivers/amadeus-pi-replay-store.ts` | `.pi/drivers/amadeus-pi-replay-store.ts` | Amadeus `internal` |

この表を resource 数の invariant にしないでください。manifest を変更したら、resource
identity と role を基準に inventory を更新します。`scripts/package.ts pi` は各 authored
resource を hash 化し、その descriptor を `dist/pi/.pi/tools/data/harness.json` へ生成します。
doctor が期待値にするのは observed install tree ではなく、この生成済み descriptor です。
driver resource は `internal` のままとし、Pi native extension list に入れてはいけません。

`scripts/pi-package.ts` は同じ manifest から Pi Package view を導出します。root
`package.json` の `pi.extensions` と `pi.skills` は `dist/pi` 配下の native entry resource
だけを公開し、setup path は完全な distribution を copy して必須 installer receipt を
書きます。local package source identity には clean worktree と full commit SHA が必要です。
Git source identity には credential を含まない canonical HTTPS と full commit SHA が必要です。
branch、short SHA、mutable tag、credential を含む URL は formal evidence になりません。
Package activation だけでは project の core runtime を配置できず、完全な Pi doctor contract
を通過できません。

生成される package entry は次のとおりです。

```json
{
  "extensions": ["./dist/pi/.pi/extensions/amadeus.ts"],
  "skills": ["./dist/pi/.pi/skills/amadeus"]
}
```

### Lifecycle event inventory

`packages/framework/harness/pi/extensions/amadeus-pi-extension.ts` は次の public Pi 0.83 event
name を all-or-nothing の 1 set として登録します。

| Pi event | Canonical lifecycle meaning |
|----------|-----------------------------|
| `session_start` | session started と recovery/reconciliation point |
| `session_shutdown` | session shutdown |
| `input` | input received。`source: interactive` だけが human presence を成立させる |
| `agent_start` | agent turn started と continuation observation point |
| `agent_end` | agent turn ended |
| `agent_settled` | 唯一の automatic continuation trigger |
| `tool_execution_start` | tool call identity で pair にする tool start |
| `tool_execution_end` | tool call identity で pair にする tool end |
| `session_before_compact` | canonical mission checkpoint |
| `session_compact` | model summary を信頼しない mission reinjection |

adapter は Pi の public structural Extension API を使います。registration、parse、journal
prepare、core commit receipt、tool pairing、continuation observation は fail-closed です。
raw prompt、tool argument、tool result、absolute path、credential を audit payload に含めては
いけません。

### Child-driver inventory

Pi に built-in subagent primitive はありません。internal driver は child を 1 つだけ
`pi --mode rpc --no-session` で起動し、size bound のある JSONL を交換して、correlation が
一致する assistant text だけを抽出します。guardian は control message を認証し、child
process group を所有します。terminal outcome は報告前に replay store へ commit され、
同じ delivery の replay で 2 つ目の child を起動しません。version、executable identity、
unsupported OS、timeout、cancellation、PID/PGID reuse の曖昧さ、malformed RPC、output bound、
replay conflict、credential に似た request field はすべて fail-closed です。

driver は deterministic swarm permit lifecycle、つまり prepare、acquire、driver が accept
した confirm、check、settle/release、terminal finalize だけを通して呼び出します。accept
された native handle を prose の主張で置き換えたり、未検証 result を converged と扱ったり
してはいけません。

### Test と generated surface

実装変更時は次の contract family を同期します。

- `tests/unit/t-pi-harness-manifest.test.ts` — runtime、trust、catalog path、collision、
  loader-role rule。
- `tests/smoke/t-pi-dist-structure.test.ts` — generated descriptor と authored resource の
  byte/hash parity。
- `tests/integration/t-pi-package-candidate.test.ts` と
  `tests/integration/setup-install-flow.test.ts` の Pi case — 共通 candidate identity、完全な
  setup install、transactional upgrade。
- `tests/integration/t-pi-lifecycle-gate-adapter.test.ts` と
  `tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts` — captured public event
  shape、human presence、journaling、continuation、compaction。
- `tests/unit/t-pi-driver-contract.test.ts` と
  `tests/integration/t-pi-child-driver.integration.test.ts` — 閉じた RPC request/result behavior、
  guardian cleanup、terminal replay。
- `tests/integration/t-pi-doctor-diagnostics.test.ts` と
  `tests/integration/t-pi-doctor-dispatch.integration.test.ts` — read-only かつ redacted な
  diagnostics と utility dispatch。
- `tests/integration/t-pi-docs-contract.test.ts` — user/maintainer section、link、manifest catalog、
  event、package metadata、generated inventory の文書化。

編集対象は `packages/framework/core/`、`packages/framework/harness/pi/`、manifest から導出される
root package metadata、setup source、authored docs/test だけです。`dist/pi` は手編集せず、
次の command で再生成・検証します。

```bash
bun scripts/package.ts pi
bun scripts/package.ts pi --check
bun test tests/unit/t-pi-harness-manifest.test.ts \
  tests/smoke/t-pi-dist-structure.test.ts \
  tests/integration/t-pi-package-candidate.test.ts \
  tests/integration/t-pi-lifecycle-gate-adapter.test.ts \
  tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts \
  tests/unit/t-pi-driver-contract.test.ts \
  tests/integration/t-pi-child-driver.integration.test.ts \
  tests/integration/t-pi-doctor-diagnostics.test.ts \
  tests/integration/t-pi-doctor-dispatch.integration.test.ts \
  tests/integration/t-pi-docs-contract.test.ts
bun run typecheck
```

これらの deterministic check は live provider journey を実行した証拠ではありません。
live result を記録できるのは、明示的に enable した live test が、別途設定した provider
credential を使って現在の環境で実際に実行された場合だけです。

## 次へ

これで弧が閉じます: あなたはデータ面を形づくり(01–08章)、いまコアを新しい CLI にレンダリングしました。ここから:

- 全体マップについては、[ハーネスエンジニアガイド概要](00-overview.ja.md) に戻ってください。
- 新しいハーネスは他のものと並んで **ユーザー向けの章** を得ます — 既存のものがどう読めるかは、User Guide の [Running on other harnesses](../guide/harnesses/README.ja.md) ファミリーを参照してください。
- 規範的なビルド契約(マニフェスト型、`emit` プラグイン API、`harnessDir()` シーム)は Developer Reference の [Architecture § Source vs distribution](../reference/01-architecture.ja.md#source-vs-distribution-one-core-many-harnesses) に存在します。
