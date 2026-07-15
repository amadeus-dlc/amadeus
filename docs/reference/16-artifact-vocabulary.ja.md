# 成果物の語彙(Artifact Vocabulary)

> 言語: [English](16-artifact-vocabulary.md) | **日本語**

この章は AI-DLC の成果物名 — 各ステージの `produces:`、`optional_produces:` および
`consumes[].artifact:` の YAML フロントマターに現れる正規文字列 — に関する成文化された
ルールです。命名の形式、衝突解決ポリシー、ファイルシステムパスの規約、そしてコマンドラインから
ライブなレジストリを参照する方法を扱います。

レジストリそのものは記述されるものではなく、**導出される**ものです。「どの正規名が存在するか」の
権威あるソースは、すべてのステージファイルにある `produces[]` と `optional_produces[]` の
和集合です。`dist/claude/.claude/tools/amadeus-graph.ts` のヘルパーがコンパイル済み
ステージグラフを読み取り、その和集合をセットとして返します — これはスコープ
(`amadeus-lib.ts:772` の `validScopes()`)やエージェント(`amadeus-lib.ts:794` の
`loadAgents()`)で使われるのと同じパターンです。レジストリをこの章の外に置くことで、並行して
手作業で維持されるリストが招くドリフトを防ぎます。

---

## ここでの成果物とは何か

成果物とは、ちょうど1つの生成ステージがその YAML フロントマターで宣言する**正規識別子**です。
必須出力は `produces[]`、条件付き出力は `optional_produces[]` で宣言します。他のステージは
`consumes[]` で同じ識別子を参照し、読み取り依存を宣言します。識別子は短いケバブケース文字列です
— ファイル拡張子なし、フォルダプレフィックスなし、スラッシュなし。

`dist/claude/.claude/amadeus-common/protocols/stage-definition.md` のマイルストーン4の実例より:

```yaml
slug: scope-definition
# ...
produces:
  - scope-document
  - intent-backlog
  - scope-definition-questions
consumes:
  - artifact: intent-statement
    required: true
  - artifact: feasibility-assessment
    required: false
```

ここで `scope-document`、`intent-backlog`、`scope-definition-questions` は scope-definition
ステージが生成する成果物であり、`intent-statement` と `feasibility-assessment` はそれが消費する
成果物です(それぞれ他のステージ — `intent-capture` と `feasibility` — が生成します)。

このレジストリで成果物**ではない**もの:

- **ファイルパス。** `<record>/ideation/scope-definition/scope-document.md`
  (ここで `<record>/` は intent のレコードディレクトリ `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`)は
  ファイルシステム上の位置であり、正規名は `scope-document` です。後述の
  「ファイルシステムマッピング」を参照。
- **ファイル名。** ディスク上の `.md` ファイルと正規名は一致する必要はありません
  (衝突時を除き、通常は一致します)。
- **状態のプラミング。** `amadeus-state.md`、`audit.md`、`.amadeus-recovery.md` は
  ツール(`amadeus-state.ts`、フックスクリプト)によって管理され、ステージがどちらかの出力リストで
  管理するものではありません。これらはレジストリに一切現れません。
- **ランタイム値。** "user's prose answer" や
  "workspace classification (greenfield/brownfield)" のような文字列は動的データであり、
  ステージ間で永続する成果物ではありません。

---

## 導出ルール

1. **ステージファイルが権威。** 各ステージの `produces:` リストは、そのステージの実行時に
   必ず生成される出力を宣言します。`optional_produces:` リストは、正当に存在しない場合がある
   条件付き出力を宣言します。`consumes:` はそのステージが依存する正規文字列を指定します。
2. **レジストリは記述されるのではなく計算される。**
   `bun dist/claude/.claude/tools/amadeus-graph.ts artifacts` を実行すると、ライブな
   レジストリを表示します — 1行に1名、アルファベット順にソート。ツールはコンパイル済みの
   `stage-graph.json` からすべてのステージの `produces[]` と `optional_produces[]` を
   和集合にします。
3. **この章に並行リストは持たない。** 読者が列挙を求める場合はツールを実行します。
   この章は正規名をレジストリテーブルとして列挙することは決してしません。
4. **メンバーシップはドクターによって検証される。** `/amadeus --doctor` は
   「Graph references」チェック(`amadeus-utility.ts`)を実行します — すべての
   `consumes[].artifact` エントリと `requires_stage[]` slug は、導出されたレジストリに対して
   解決可能でなければなりません。孤立した消費者は壊れた参照として報告されます。

32個のステージファイルすべてが `produces:` を宣言し、`optional_produces:` で宣言された
条件付き出力がその集合を補うため、導出は完全なレジストリを返します。ツールは空データにも対応し、
どちらの出力リストも持たないステージは何も寄与しません。出荷されるフレームワークでは、すべての
ステージに出力が宣言されています。

---

## 命名ルール

すべての正規名は `/^[a-z][a-z0-9-]*$/` を満たす必要があります — これは
`dist/claude/.claude/tools/amadeus-stage-schema.ts` の `SLUG_RE` によって強制される形式です。
つまり:

- **小文字のみ。** `scope-document` であり、`ScopeDocument` や `SCOPE_DOCUMENT` ではない。
- **ファイル拡張子なし。** `scope-document` であり、`scope-document.md` ではない。
- **フォルダプレフィックスなし、スラッシュなし。** `scope-document` であり、
  `ideation/scope-definition/scope-document` ではない。
- **文字で始まる。** `s1` は有効、`1-thing` は無効。
- **内部のハイフン、数字、小文字のみ。** アンダースコアなし、スペースなし、Unicode 文字なし。

質問成果物は慣習として `<stage-slug>-questions` 規約に従います — ユーザー入力を収集する
ステージは、主要な成果物と並んで兄弟の `<slug>-questions` 正規名を宣言します。これはパーサの
ルールではなく慣習です。

形式は**フラットな名前空間**です — `<phase>/<stage>/<artifact>` のような階層プレフィックスは
ありません。これは他のすべての AI-DLC 識別子と一致します。エージェント slug、スコープ名、
ステージ slug、フェーズ名はすべてフラットなケバブです。

---

## 衝突ポリシー

1つのステージ内では、各出力リスト内で同じ成果物を重複させず、`produces[]` と
`optional_produces[]` を互いに素にする必要があります。また、2つの生成ステージが、どちらかの
リストで同じ正規名を宣言することは**禁止**されています。レジストリはセットであり、名前は
グローバルに一意でなければなりません。同じ基礎概念が2つのステージによって発行される場合、
曖昧さを解消する2つの別々の名前を選びます。

今日の唯一の例: `build-and-test`(Construction)と `performance-validation`(Operation)は
どちらも `test-results.md` というファイルを書き込みます。正規名は分割され、両者がワイヤー上で
決して衝突しないようにされています:

- `build-test-results` — `build-and-test` が発行。そのステージの兄弟名とペアになります:
  `build-instructions`、`unit-test-instructions`、`integration-test-instructions`、
  `performance-test-instructions`、`security-test-instructions`、`build-and-test-summary`。
- `load-test-results` — `performance-validation` が発行。同じステージが既に生成する
  `load-test-plan` とペアになります。

両方の名前とも、今日それぞれのステージの `produces:` リストに出荷されています。

**ディスク上のファイル名は一致する必要はありません。** 両ステージともそれぞれのフォルダで
`test-results.md` に書き込み続けられます。正規名はファイル名ではなくワイヤー識別子です。

---

## ファイルシステムマッピング

成果物は `(正規名) + (生成ステージ) + (per-unit フラグ)` から導出可能なパスでディスク上に
存在します。今日は2つの形式があります:

- **非 per-unit ステージ(29個中24個):**
  `<record>/<phase>/<stage>/<canonical-name>.md`
  例: `feasibility-assessment`(Ideation の `feasibility` ステージが生成)は
  `<record>/ideation/feasibility/feasibility-assessment.md` に存在します。

- **per-unit Construction ステージ(29個中5個):** `nfr-requirements`、
  `nfr-design`、`functional-design`、`infrastructure-design`、`code-generation`。
  これらは Construction 中に Unit of Work ごとに各成果物のコピーを1つ発行します:
  `<record>/construction/{unit-name}/<stage>/<canonical-name>.md`
  例: `business-logic-model`(`functional-design` が生成)は
  `<record>/construction/{unit-name}/functional-design/business-logic-model.md` に存在します。

per-unit 状態は、ステージの `for_each: unit-of-work` フロントマターフィールドによって宣言されます
— Unit ごとに1回実行される5つの Construction ステージがこれを持ち、残りは省略します。将来の
ヘルパーは、ステージグラフ + 正規名からパスを機械的に計算できるでしょう。

**codekb は space レベルの例外。** Reverse-engineering の9つの成果物
(`business-overview`、`architecture`、`code-structure`、`api-documentation`、
`component-inventory`、`technology-stack`、`dependencies`、
`code-quality-assessment`、`reverse-engineering-timestamp`)は、per-intent レコード
ディレクトリの下では**解決されません**。これらは `amadeus/spaces/<space>/codekb/<repo>/` にある
永続的な per-repo のコード知識ベースに配置されます — これは space 内のすべての intent で共有される
ストアで、intent ではなく repo によってキー付けされます。パスは
`resolveArtifactPath`(`dist/claude/.claude/tools/amadeus-orchestrate.ts`)の `isCodekb`
ブランチを経由して、レコード相対ルールの外で解決されます。同じディレクトリは読み取り専用の
`/amadeus codekb-path` コマンドによって表示されます。

**衝突時は正規名 ≠ ファイル名。** 衝突が分割される場合(前述参照)、ディスク上のファイル名は
分割前の形式(`test-results.md`)を保持する一方で、正規名は曖昧さを解消したバージョンになる
ことがあります。ファイルシステムではなく、ステージの `produces:` と `optional_produces:` の
両リスト、および `bun amadeus-graph.ts artifacts` を真実のソースとして使ってください。

---

## ライブなレジストリを参照する方法

```bash
bun dist/claude/.claude/tools/amadeus-graph.ts artifacts
```

1行に1つの正規名を、アルファベット順にソートして表示します。

PR-8 以前の出力は空です — ステージがまだ YAML に移行しておらず、`produces:` が populated では
ないためです。PR-8 以降、出力は29個の非 initialization ステージにわたっておよそ118個の名前まで
拡大します。

`wc -l` にパイプすればカウント、`grep` でフィルタ、期待されるベースラインに対する `diff` で
ドリフトチェックができます。

---

## 成果物の追加またはリネーム

この章への編集は不要です — レジストリは導出されます。

**新しい成果物を追加するには:**

1. 生成ステージの `.md` ファイルを編集する。必須出力なら `produces:`、実際に条件付きとなる
   出力なら `optional_produces:` に正規名を追加する。
2. `bun amadeus-graph.ts artifacts` を実行して、それが現れることを確認する。
3. `/amadeus --doctor` を実行して、もはや存在しない名前を参照する消費者がいないことを
   確認する(「Graph references」チェック)。

**成果物をリネームするには:**

1. 生成ステージで、その成果物を宣言している出力リストのエントリをリネームする。
2. すべての消費ステージの `consumes[].artifact` エントリでリネームする。
3. `/amadeus --doctor`(PR-11 以降)は、更新し忘れた消費者を捕捉します — 古い名前は
   missing-producer エラーになります。

ステージグラフの CI ドリフト検出(`amadeus-graph compile --check`)は、YAML ソースから
`stage-graph.json` を再生成し忘れたリネームを捕捉します。

---

## 安定性

v1.0 出荷時点のライブなレジストリが、フレームワークの成果物サーフェスの安定性ベースラインです。
成果物名の安定性ポリシーは以下のとおりです:

- **リネーム**と**削除**はメジャーバージョン変更です — v1.x → v2.0。
- **追加**はマイナーバージョンで出荷されます — v1.0 → v1.1 など。
- **v1.0 まで in-flight:** 現在の v0.3.0 Foundation セットが出発点です。後続の
  v0.4.0〜v0.11.0 リリースは、方法論の進化に伴い名前を追加、リネーム、または削除する
  ことがあります。

このポリシーはライブデータに対して強制可能です。タグ時点のレジストリと HEAD 時点のレジストリの
ドリフトは1行の `diff` です。

---

## 相互参照

- `dist/claude/.claude/amadeus-common/protocols/stage-definition.md` —
  権威あるステージ形式の仕様。`produces[]`、`optional_produces[]`、`consumes[]` を
  構造化フィールドとして定義。
- [Stage Definition](15-stage-definition.ja.md) — 仕様に関する叙述的な章。
- [State Machine](12-state-machine.ja.md) — 監査イベントの並行導出パターン:
  正規 enum はドキュメントではなく `amadeus-audit.ts` に存在。
- [User Guide — Artifacts Reference](../guide/14-artifacts-reference.ja.md)
  — ユーザー向けの成果物ライフサイクルとディレクトリレイアウト。
- `dist/claude/.claude/tools/amadeus-graph.ts` — 導出ツール
  (`artifactsRegistry()` + `artifacts` CLI サブコマンド)。
