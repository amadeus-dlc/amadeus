# センサーシステム

> 言語: [English](07-sensor-system.md) | **日本語**

> 対象読者: Tier 2/3(チーム採用者、フレームワークコントリビューター)。

この章はAI-DLCセンサーマニフェストの**スキーマリファレンス**です —
ステージの出力への書き込みで発火する決定論的なチェックです。
センサーは制御ループのフィードバック側の半分です。ルールは
フィードフォワード側の半分です(次章の[ルールシステム](08-rule-system.ja.md)を参照)。[プレーンアーキテクチャ](02-plane-architecture.ja.md)の章は、
両者をコンパイルが各ステージノードに解決する制御プレーンの入力として
位置づけます。

この章はマニフェストの*ファイルフォーマット*を扱います — センサーマニフェストが
何を含むか、ステージがどのようにセンサーをインポートするか、出荷された4つのマニフェストが
どう設定されているかです。ワークフロー中にセンサーがどう発火するかのユーザー向けの
ビューについては、ユーザーガイドの[ルールと学習ループ](../guide/09-rules-and-the-learning-loop.ja.md)を
参照してください。

> **パス規約。** 本書の `<record>/` = アクティブintentのrecord dir、
> `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`(コンパクトなUTC日付プレフィックス
> に短いkebab-caseのラベルを付けたもので、record dir が時系列でソートされる。
> 正典のidは `intents.json` レジストリ行に格納されたUUIDv7)。出荷されたマニフェストの
> 2つのdocument-shapeセンサーの `matches` globは、依然としてレガシーの
> artifact-treeパスを含む点に注意(スキーマが文書化される箇所で下記に逐語的に引用)。

ランタイムの挙動については[ステージプロトコル](04-stage-protocol.ja.md)を参照してください。
ステージ定義のファイルフォーマットの対応物は
[ステージ定義](15-stage-definition.ja.md)にあります。

---

## マニフェストの場所とファイル名

センサーマニフェストは以下に置かれます:

```
dist/claude/.claude/sensors/amadeus-<id>.md
```

フレームワークが出荷するすべてのマニフェストは `amadeus-` ファイル名プレフィックスを
持ちます(より広いフレームワークファイル規約に一致)。フロントマターの `id:`
フィールドは、ファイル名の語幹から `amadeus-` プレフィックスを除去し
`.md` サフィックスを取り除いたものと一致しなければなりません(MUST):

| ファイル名 | 必須 `id:` |
|---|---|
| `amadeus-required-sections.md` | `required-sections` |
| `amadeus-linter.md` | `linter` |

filename↔id ルールは `tests/unit/t86-sensor-manifest-schema.sh` によって強制されます。
`amadeus-` プレフィックスは**すべてのセンサーに必須であり、カスタムの
ユーザー出荷センサーも含みます**: コンパイルリゾルバは
`SENSOR_FILE_REGEX = /^amadeus-([a-z][a-z0-9-]*)\.md$/`(`amadeus-graph.ts` の `loadSensors`)で
マニフェストを検出するため、プレフィックスのないファイルは静かにスキップされ、ステージに
決してバインドされません。カスタムセンサーは `amadeus-<id>.md` と命名し `id: <id>` を設定してください。

---

## センサーマニフェストスキーマ

すべてのマニフェストは、YAMLフロントマターと本文を持つMarkdownファイルです。
フロントマターは構造化された契約 — 純粋な能力記述子 — であり、
本文はチェックを文書化する人間向けのプロースです。マニフェストは
*センサーが何であるか*を記述し、どのステージが使うかは記述しません。その関係は
ステージ側の `sensors:` フロントマターフィールドに存在します(下記の
[ステージがセンサーをインポートする方法](#how-stages-import-sensors)を参照)。

```yaml
---
id: required-sections                       # required
kind: deterministic                          # required
command: bun .claude/tools/amadeus-sensor-required-sections.ts   # required
default_severity: advisory                   # required
description: Checks that stage output ...    # required
category: document-shape                     # optional
matches: "**/{amadeus-docs,intents}/**"                  # optional capability filter
input_schema:                                # optional
  output_path: string
  stage_slug: string
output_schema:                               # optional
  pass: boolean
  missing_headings: string[]
timeout_seconds: 5                           # optional
---

# required-sections sensor

<body — prose documenting default mode, override mode, failure mode>
```

| フィールド | 必須 | 型 | ノート |
|---|---|---|---|
| `id` | ✓ | kebab-case文字列 | ファイル名の語幹から `amadeus-` プレフィックスを除いたものに等しい。ルールファイルの `pairing:` フィールドから相互参照される([ルールシステム](08-rule-system.ja.md)を参照)。 |
| `kind` | ✓ | enum | 現在は `deterministic` のみ受け付ける。`llm` は v0.11.0 の LLM-dispatch 章のために予約。下記の[`kind` enum](#kind-enum)を参照。 |
| `command` | ✓ | string | 正典の呼び出しプレフィックス — 出荷された各センサーは自身のper-sensorスクリプトを名指しする(例 `bun .claude/tools/amadeus-sensor-required-sections.ts`)。ディスパッチャ(`amadeus-sensor.ts`)は `--stage <slug>` に加え、センサーの入力形状に一致するファイルフラグを追加する: document センサーは `--output-path <path>`、code センサー(`linter`、`type-check`)は `--file-path <path>`。 |
| `default_severity` | ✓ | enum | 現在は `advisory` のみ受け付ける。`blocking` は将来の ralph-driver 作業のために予約。 |
| `description` | ✓ | string | 1行の人間向け説明。 |
| `category` | optional | string | フリーフォームの記述ラベル(出荷された4つのマニフェストは `document-shape` と `code-quality` を使う。閉じたenumではない)。 |
| `matches` | optional | glob文字列 | PostToolUse フックが発火時に消費する能力フィルタ。下記の[`matches` フィルタ](#matches-filter)を参照。 |
| `input_schema` | optional | object | 現在はアドバイザリー。将来のLLMディスパッチがテンプレート化の契約として使う。 |
| `output_schema` | optional | object | 現在はアドバイザリー。将来のLLMディスパッチがパースの契約として使う。 |
| `timeout_seconds` | optional | int | 発火ごとの実時間キャップ。 |

---

## `kind` enum

`kind` フィールドはディスパッチメカニズムを宣言します。スキーマは現在、
正確に1つの値を受け付けます:

- `deterministic` — マニフェストの `command:` は、exit 0(pass)/ 非ゼロ(fail)で
  終了し既知のパスに構造化された詳細を書き込む、自己完結型の
  シェル呼び出しである。

`llm` は **LLM-dispatch 章(v0.11.0+)のために予約**されています。その
章が出荷されるまで、消費者は `kind: llm` をパース時に拒否しなければなりません(MUST)。
予約は書き込み時に強制されます: 今日 `kind: llm` マニフェストを出荷することは
パーサが拒否するマニフェスト作者のエラーです。

`kind` の不明な値(`deterministic` 以外のすべて)はパース時に
拒否されます。前方互換性は*不明なキー*に適用され
([前方互換性ポリシー](#forward-compat-policy)を参照) — 既知のキーの不明な
値には適用されません。

---

## ステージがセンサーをインポートする方法

プル方式のオーサリング: 各ステージのフロントマターが使用するセンサーを宣言します。
コンパイルリゾルバは宣言された各idをマニフェストレジストリで検索し、
`sensors_applicable` 配列をステージのコンパイル済みグラフノードに焼き込みます。
オーサリングの方向はlocality-of-referenceです — ステージファイルを開けば、
ステージ実行時にどのチェックが発火するかが正確に分かります。

```yaml
# dist/claude/.claude/amadeus-common/stages/construction/code-generation.md
---
slug: code-generation
phase: construction
# ...
requires_stage: [...]
sensors:
  - linter
  - type-check
inputs: ...
outputs: ...
---
```

`sensors:` はむき出しのidのリストです — idは各マニフェストの
フロントマター `id:` フィールドに一致し、それは(filename↔id 契約に従い)
ファイル名の語幹から `amadeus-` プレフィックスを除いたものに等しくなります。コンパイルリゾルバは:

1. `dist/claude/.claude/sensors/` を走査し、すべての
   `amadeus-<id>.md` マニフェストをパースする。
2. 解決時のO(1)ルックアップのためにマニフェストをidでインデックスする。
3. 各ステージについて、宣言された各インポートidを検索する。不明なら例外を投げる
   (発火時のサイレントではなく、コンパイル時の声高な失敗)。
4. マニフェストの `matches` フィルタを解決済みの
   `sensors_applicable[]` エントリに逐語的にコピーする。
5. per-stage の解決済み配列を正典の
   `data/stage-graph.json` に発行する(FIELD_ORDER ピン: `rules_in_context` の後)。

ランタイムの PostToolUse フック(`amadeus-sensor-fire.ts`)は
グラフノードから `sensors_applicable` を読み — マニフェストを決して再オープンしません。
`matches` は
コンパイルスナップショットされます: ワークフロー中のマニフェスト編集は、フライト中の
ワークフローの書き込みに対して何が発火するかを変えません(BGP-stability
特性 — [プレーンアーキテクチャ](02-plane-architecture.ja.md)を参照)。

### ステージ別センサーマトリクス(32フレームワークステージ)

| ステージ | `sensors:` |
|---|---|
| 3 initialization(workspace-scaffold, workspace-detection, state-init) | `[]`(決定論的セットアップ、エージェント作成のmarkdownなし) |
| 7 ideation、8 inception、7 operation の markdown ステージ + `code-generation` | markdown ステージは `[required-sections, upstream-coverage]`。`code-generation` は `[linter, type-check]`(コードのみ) |
| `build-and-test` | `[required-sections, upstream-coverage, type-check]`(linter は意図的に省略 — ビルドが正典のlintを実行) |
| 5 construction-design(ci-pipeline, functional-design, infrastructure-design, nfr-design, nfr-requirements) | `[required-sections, upstream-coverage, linter, type-check]`(コードサンプルを含むmarkdown設計) |

フォークは、ステージの `sensors:` リストを直接編集することでステージをカスタマイズします
— バインディングはカスタマイズされる対象の隣に存在します。マニフェストは
純粋な能力記述子です。ステージターゲティングのフィールドを持ちません(`applies_to:` は
存在しません — プル方式オーサリングが取り除きました)。strict-additive ランタイムが
適用されます: フォークがステージにセンサーを望むならインポートし、望まないなら
省略します。推論すべきオーバーライド層はありません。

---

## `matches` フィルタ

`matches` はマニフェスト上のオプションのトップレベル能力記述子です。
センサーが解析できるファイルのglob形状を宣言し —
*「このセンサーはこのglobに一致するファイルを解析する」* — 
コンパイル時のリゾルバではなく発火時の PostToolUse フックが消費します。

| マニフェスト | `matches` |
|---|---|
| `amadeus-required-sections.md` | `**/{amadeus-docs,intents}/**` |
| `amadeus-upstream-coverage.md` | `**/{amadeus-docs,intents}/**` |
| `amadeus-linter.md` | `**/*.{ts,js}` |
| `amadeus-type-check.md` | `**/*.{ts,tsx}` |

`matches` **こそが**発火フィルタです — 実際にはオプションではありません。フックは
書き込まれるパスをglobと比較し、一致した場合のみ発火します。
`matches` globを**持たない**エントリは一切発火しません(`amadeus-sensor-fire.ts`:
`if (!entry.matches) continue`)。したがって出荷された4つのマニフェストはすべて
1つを宣言します — 2つのdocument-shapeセンサーはartifact treeにスコープし(出荷された
マニフェストは上記に示した `matches` 値を持つ)、2つの
code-qualityセンサーはそれぞれの言語globにスコープします。コンパイルリゾルバは
`matches` を per-stage の `sensors_applicable[]` エントリに逐語的にコピーし、フックは
グラフノードからスナップショットされた値を読みます。

空文字列(`matches: ""`)はパース時に拒否されます。globが欠けていると
センサーが決して発火しないため、マニフェストは適用対象のglob形状を宣言しなければなりません
— 「すべてで発火する」モードはありません。

### ルールとセンサーの相互参照

ルールファイルは `pairing: amadeus-required-sections`(`amadeus-` プレフィックス付き)を
使ってセンサーへフィードフォワードします。センサーマニフェストの `id:` は
`required-sections`(プレフィックスなし)です。doctor のカバレッジチェックは、
マニフェスト `id` に対して照合する前にルールの `pairing:` 値から
`amadeus-` プレフィックスを取り除いて正規化します。

---

## `default_severity`

`advisory` が v0.5.0 で唯一の有効な値です。アドバイザリーなセンサーの
失敗は監査行 + 詳細ファイルを生成しますが、ステージのゲートや
ユーザーのワークフローをブロックしません。

`blocking` は将来の ralph ドライバーのために予約されています。
ドライバーが着地するまで、このフィールドは構造的には存在しますが意味的には
単一値です。

---

## `command:` 呼び出し契約

マニフェストの `command:` は**正典の呼び出しプレフィックス**であり、
完全なargvではありません — 出荷された各センサーは自身のper-sensorスクリプトを名指しします。
ディスパッチャ(`amadeus-sensor.ts`)は発火時にランタイムコンテキストを追加します: 常に
`--stage <stage-slug>`、次にセンサーの入力形状に一致するファイルフラグ —
document センサーは `--output-path <file>`、code センサー(`linter`、`type-check`)は
`--file-path <file>`:

```
<command> --stage <stage-slug> --output-path <file-being-written>   # document sensor
<command> --stage <stage-slug> --file-path   <file-being-written>   # code sensor
```

したがって次のようなマニフェスト:

```yaml
command: bun .claude/tools/amadeus-sensor-required-sections.ts
```

は、intentのrecord dirにrequirements成果物を書き込む
`requirements-analysis` に対して呼び出されると、次のようにディスパッチされます:

```
bun .claude/tools/amadeus-sensor-required-sections.ts \
  --stage requirements-analysis \
  --output-path amadeus/spaces/default/intents/260624-inventory-api/inception/requirements-analysis/requirements.md
```

マニフェストはper-fireのフラグをエンコードしません。ディスパッチャが
それらを追加します。マニフェストは純粋な能力記述子のままです。

---

## ゲート儀式のハンドオフ(surface stdout / selections-file in)

§13 学習ゲートはツール・アズ・アクターです。決定論的なツール
(`amadeus-learnings.ts`)とコンダクター(ライブの `/amadeus` セッション)の
ラウンドトリップには2つの脚があり、その間に知識ステップと判断
ステップがあります:

1. **`surface`(stdout)。** `bun .claude/tools/amadeus-learnings.ts surface
   --slug <stage-slug>` はステージの `memory.md` を読み、構造化された
   JSONを表示する: `candidates[]`(空でない Interpretation / Deviation /
   Tradeoff エントリごとに1つ、それぞれ `id`、`source_heading`、`ts`、`summary`、
   `context`、`default_scope: "project"` を持つ)に加え、読み取り専用の
   `parked_open_questions[]`。AskUserQuestion のフィールド名はなし — 純粋なドメイン
   データ。オープンな質問は決して候補にならない(リサーチ項目である)。
2. **コンダクターが AskUserQuestion をレンダリングする(知識)。** 候補ごとに1つの
   オプション(label = 候補の `summary` を逐語的に。description = 導出された宛先、
   例 `→ memory/project.md (Deviation)` に加え、promote-to-team のアフォーダンス)。
   `multiSelect` の後、コンダクターは保持された各labelをその候補
   `id` + `source_heading` に相関付ける。次に常に「次回のために追加することは?」と
   尋ねる。任意のフリーテキストには単一の heading-pick AUQ(Interpretation / Deviation /
   Tradeoff / Open question)が付く — heading pick がユーザーの唯一の分類であり、
   宛先はそれから導出される。
3. **Admission conflict-check(知識 → オーケストレーターLLM。どの
   選択が persist に到達するかをゲートする)。** 保持された各学習について、コンダクターは
   単一の提案された日付付きエントリを `org.md` の
   一致する `## <section>`(§5 admission ゲートの単一行バリアント)と比較する。
   矛盾がある場合、コンダクターは矛盾する org の文をインラインで表面化し、
   ユーザーが修正 / スキップ / エスカレーションする(判断 → ユーザー。
   ユーザーオーバーライドのパスはない)。conflict-clear またはユーザーがエスカレーションした選択のみが
   進む。センサーマニフェストには org セクションの類似物がなく、このチェックをスキップする。
4. **`persist`(selections-file in)。** コンダクターは保持された
   選択を `<record>/.amadeus-learnings/<slug>-selections.json`(intentのrecord dir内)に
   書き込み(gitignore対象)、`bun .claude/tools/amadeus-learnings.ts persist
   --slug <slug> --selections-json <path>` を呼び出す。ツールは決定論的な
   ライターである — 決して矛盾を判断しない。各学習をプラクティスとして
   `amadeus/spaces/<space>/memory/{project,team}.md` にルーティングし、センサー選択については
   2書き込みのインストール(マニフェスト + 起点ステージ `sensors:` フロントマター)を
   1つの `withAuditLock` 内で行い、次に `RULE_LEARNED` / `SENSOR_PROPOSED` を発行する。

selections-file はリプレイの成果物です: クラッシュした persist は、人間に
再プロンプトすることなく同じJSONをリプレイします(書き込まれた行ごとの
`<!-- cid:<slug>:<id> -->` マーカーによるcontent-presence 冪等性)。

---

## スキャフォールドされるマニフェストのデフォルト

センサー提案がゲートで確定されると、ゲート儀式ツールは
新しい**project-tier**マニフェストを
`<project>/.claude/sensors/amadeus-<id>.md` にスキャフォールドします — 出荷されたフレームワーク
ディストリビューションではありません(per-project の学習ループはフレームワークを変更してはならない。
フレームワークディストリビューションのパスは拒否される)。フィールドは次のようにデフォルト設定されます:

| フィールド | デフォルト | ノート |
|---|---|---|
| `id` | ユーザーのフリーテキストから導出(kebab-case化) | |
| `kind` | `deterministic` | 現在唯一の受け付けられる値 |
| `command` | `bun .claude/tools/amadeus-sensor-<id>.ts` | プレースホルダーのper-sensorスクリプト。ユーザーがチェックを実装するスクリプトに更新する |
| `default_severity` | `advisory` | 現在唯一の受け付けられる値 |
| `description` | ユーザーのフリーテキストから | |
| `category` | `""` | 希望すればユーザーが記入 |
| `matches` | 発火にはglobが必須 | スキャフォールドはセンサーが適用されるglob形状(artifact-tree globまたは `**/*.ts` のようなcode glob)を求める。`matches` のないエントリは決して発火しない |
| `input_schema` | `{ output_path: string, stage_slug: string }` | ディスパッチャが追加するフラグに一致 |
| `output_schema` | `{ pass: boolean }` | ディスパッチャが依存する最小構造 |
| `timeout_seconds` | `30` | 保守的なデフォルト。遅いディスパッチャ向けに調整する |

マニフェストをスキャフォールドした後、ゲート儀式ツールは — 同じ
`withAuditLock` トランザクション内で — 新しいidを起点
ステージの `sensors:` フロントマターリストに追記します(プル方式オーサリングの2書き込み
インストール)。センサーは次回のワークフローがコンパイルされたときに完全に配線されます。これは
1つの承認済みのステージフロントマター編集です: インポートリスト(形状は不変で
内容は不変ではない)を成長させ、`## Steps` / `## Sensors`
/ `## Learn` の本文は決して成長させません。

出荷された4つのマニフェストは、これらのデフォルトが後に進化する
バリエーションを示します: `amadeus-required-sections.md` と
`amadeus-upstream-coverage.md` は、artifact-treeの `matches` glob(上記の `matches` テーブルに
示した値)とともに `timeout_seconds: 5` を使います。
`amadeus-linter.md` は `matches: "**/*.{ts,js}"` とともに `30` を使います。
`amadeus-type-check.md` は `matches: "**/*.{ts,tsx}"` とともに `60` を使います。

---

## 前方互換性ポリシー

センサーマニフェストの消費者(コンパイル、ディスパッチャ、ゲート儀式
スキャフォールディング、doctor)は**不明なマニフェストキー**を許容しなければなりません(MUST)。
将来のリリースがオプションの `cool_new_field:` を追加した場合、古い消費者は
マニフェストをパースし、そのフィールドを無視して続行します。これにより
フォークやアップグレード前のワークスペースを壊すことなく、スキーマの
追加的な進化が可能になります。

前方互換性は既知のキーの不明な値には適用されません。上記の
[`kind` enum](#kind-enum)で文書化されているとおり、`kind` の不明な値は
パース時に拒否されます。同じ原則が他の
enum型のフィールド(`default_severity`)にも適用されます。

---

## 将来のリリースのために予約

いくつかのセンサー能力はスキーマ内で予約されていますが、まだ
アクティブではありません。着地したときにフィールド形状が安定するようにするためです:

- **`kind: llm` ディスパッチ** — LLM評価センサー(v0.11.0)。
  スキーマは現在 `kind` を受け付けますが、`deterministic` 以外の値は
  パース時に拒否します。
- **`blocking` severity** — アドバイザリーテレメトリを記録するのではなく
  ゲートを停止するセンサー失敗(v0.10.0 ralph ドライバー)。現在は
  `advisory` が唯一の受け付けられる値です。

いずれも書き込み時に強制されます: 今それらを使うマニフェストを出荷することは
パーサが拒否する作者のエラーです。

## 次のステップ

- **ルール** — 制御ループのフィードフォワード側の半分は、`pairing:` フィールドを介して
  これらのセンサーと対になります。[ルールシステム](08-rule-system.ja.md)を参照。
- **ユーザー向けの学習ループ** — センサー提案がどのように表面化され
  ゲートで確定されるか、そして確定された提案がどのように
  新しいマニフェストをスキャフォールドするか。ユーザーガイドの[ルールと学習
  ループ](../guide/09-rules-and-the-learning-loop.md)を参照。
- **コンパイル境界** — `sensors_applicable` がワークフロー開始時に一度
  解決され、発火時にグラフノードから読まれる仕組み。
  [プレーンアーキテクチャ](02-plane-architecture.ja.md)を参照。

上記のスキーマに加え、`dist/claude/.claude/sensors/` の出荷された4つの
マニフェストが、動作する例です。
