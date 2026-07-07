# ステージ定義

> 言語: [English](15-stage-definition.md) | **日本語**

本章では AI-DLC のステージ定義の **ファイルフォーマット** — YAML
フロントマター契約、3コンパートメントの本体モデル、そしてそれらのソースを
`stage-graph.json` へと変えるコンパイルパイプライン — を文書化します。
ランタイムの挙動契約(承認ゲート、質問フロー、状態トラッキング)を扱う
[Stage Protocol](04-stage-protocol.ja.md) を補完するものです。本章はステージファイルが
*何を含むか* についてであり、Stage Protocol の章はステージが *何をするか* についてです。

コントリビューターはフォーマットを理解するために本章を読みます。ステージファイルを
書いたり編集したりする際は、権威ある契約が
`dist/claude/.claude/amadeus-common/protocols/stage-definition.md` にあるので参照してください。
そのファイルが正典の仕様です — 本章はナラティブと「いつ使うか」のガイダンスを加えます。

---

## 2つの読者、1つのファイル

すべてのステージ `.md` ファイルは2人の読者に仕える:

- **パーサー**(`lib.ts` の `parseStageFrontmatter`、milestone 7 で出荷)。
  YAML フロントマターを読み、構造化された `StageEntry` を生成する。本体には
  触れない。
- ステージを実行する **LLM エージェント**。本体を読み、散文の指示に従い、
  成果物を生成する。フロントマターには触れない。

両者を1つのファイルにまとめることは、コントリビューターがグラフエッジと
実行ステップを並べて見られることを意味します。それらを別々のファイルに
分割する(グラフ用に YAML 1つ、エージェント用に散文 1つ)と、ステージを
レビュー可能にしているインラインの可視性が壊れてしまいます。

---

## なぜ Variant A3 なのか

このフォーマットは「Variant A3」と呼ばれます — v0.3.0 の計画中に検討された
3つの著述バリアントのうち3番目です:

- **1ファイルは分割ファイルに勝る。** フロントマターと散文を1つの `.md` に
  まとめることで、グラフ構造と実行ステップが一緒になる。ステージを読む
  レビュアーは両方を見る。
- **Grep フレンドリー。** プレーンテキスト。バイナリフォーマットも、著述時の
  YAML-vs-JSON 変換もない。
- **Diff フレンドリー。** フィールドの追加、リネーム、本体の編集はすべて
  コードレビューでクリーンに現れる。

却下された代替案は、中央のグラフファイル(手編集される `stage-graph.json`)と
散文のみのステージでした。ステージがどの成果物を生成するかを、その散文を
編集しながら知るというインラインの可視性を失います。

---

## 著述フロー

```
┌─────────┐         ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ Edit    │  ───→   │ Pre-commit hook  │  ───→   │ stage-graph.json │  ───→   │ loadStageGraph() │
│ stage   │         │ amadeus-graph      │         │ (build artifact, │         │ (runtime,        │
│ .md YAML│         │ compile          │         │  checked in)     │         │  unchanged)      │
└─────────┘         └──────────────────┘         └──────────────────┘         └──────────────────┘
     │                                                                                 ▲
     │                              ┌──────────────────┐                               │
     └────────────────────────────→ │ CI drift check   │ ──── blocks merge on drift ───┘
                                    │ compile --check  │
                                    └──────────────────┘
```

YAML が権威あるものです。JSON はビルド成果物です。CI がその関係を強制します。

`amadeus-graph compile` と `compile --check` は CLI サブコマンドとして出荷されます(milestone 9)。
ステージ YAML を編集した後は compile を手動で実行し、CI が `compile
--check` を強制してドリフトを検出します。これを自動化する pre-commit フックは
後の PR に延期されています。`stage-graph.json` はコンパイル済み成果物です — それを
手で編集しないでください。YAML を編集して再コンパイルしてください。

---

## フィールドリファレンス — いつ使うか

権威ある仕様には、型と制約を含む完全なフィールドテーブルがあります。
このセクションは判断を要するフィールドについてナラティブを加えます。

### `requires_stage`

依存エッジをエンコードします。2つの役割:

1. **セマンティックなデータ依存。**「私は成果物 X を消費し、それはステージ Y
   が生成する」→ `requires_stage` に `Y` を追加。
2. **提示順序エッジ。** 同じフェーズにある2つのステージで、セマンティックな
   依存はないが固定された順序があるもの(例: Ideation で `feasibility` の前の
   `market-research`)。計算された `display_order` が安定して定まるよう、弱い
   エッジを追加する。

コンパイルステップの slug アルファベット順のタイブレークはセーフティネットです。
特定の順序で定まらねばならないステージについては、アルファベット順の偶然に
頼るのではなく、エッジを明示的に著述してください。

### `for_each`

インスタンスが反復を駆動する成果物を名指しします。ステージはインスタンスごとに
1回実行されます。

今日のユースケース: 5つの Construction ステージ(`functional-design`、
`nfr-requirements`、`nfr-design`、`infrastructure-design`、`code-generation`)は
Unit ごとに1回実行されます — それぞれが `for_each: unit-of-work`(`units-generation` が
生成する成果物)を宣言します。

明日のユースケース: 環境ごと、テナントごと、リージョンごと、コンプライアンス
管轄ごとに実行されるステージ。このプリミティブはワークフローエンジンとして
汎用的です。Construction がたまたま最初にそれを行使しているだけです。

**集約は宣言されるのではなく推論されます。** `for_each` ステージが生成した
成果物を消費し、自身の `for_each` を宣言しないステージは、定義上、集約ステップ
です。`build-and-test` が正典の例です — それは5つの Construction `for_each`
ステージすべてが Unit にわたって反復を終えた後に1回実行され、それらの集約された
出力を消費します。明示的な `fan_in` や集約フィールドはありません — グラフ探索が
それを解決します。

### `workspace_requires`

Boolean、デフォルト `false`。per-intent の record dir の下の計画文書だけでなく、
**ソースコードをワークスペースルートに書き込む** 必要のあるステージに `true` を
設定します。

なぜ存在するのか: ステージの `produces[]` 成果物は常に record dir の下の
markdown へ解決されます(パスリゾルバがそれらを書き込む唯一の場所)。したがって、
「produces は存在するか?」のチェックは、`code-generation` ステージが
`code-generation-plan.md` と `code-summary.md` を書いたが実際のコードを1行も
出力しなかった(issue #366)場合でも満たされてしまいます。`workspace_requires: true` は
そのギャップを閉じます: ステージ完了の成果物ガード(`amadeus-state.ts` の
approve/advance/finalize/complete-workflow)は、ステージが完了できる前に、
`amadeus/` ワークスペースツリーとハーネスディレクトリの外での実際のソース作業の
証拠を追加で要求します。

「ソース作業」がどう検出されるかはワークスペースに依存します:
- **Git ワークスペース** - ガードは git に尋ねるため、このセッションのコードを
  ブラウンフィールドリポジトリの既存の `src/` と区別できます。未コミットまたは
  追跡されていない非ドキュメントの変更(`git status --porcelain`)があるか、
  最後のコミットが非ドキュメントのパスに触れた(`git diff --name-only HEAD~1 HEAD`)
  場合にパスします。2番目の節は、commit-then-approve(クリーンな作業ツリー、
  最後のコミットにコード)でも依然としてパスすることを意味し、#366 Update 3 の
  clean-tree の誤ブロックを閉じます。
- **非 Git ワークスペース**(または任意の git エラー) - ガードはシェルを使わない
  ファイルシステム存在チェックにフォールバックします: 少なくとも1つのファイルが
  `amadeus/` ワークスペースツリーとハーネスディレクトリの外に存在しなければ
  なりません。

今日それを宣言するのは `code-generation` のみです(本体がアプリケーションコードを
ワークスペースルートに書き込む唯一のステージです)。独自のコードまたは設定を
出力するステージ(コントラクトジェネレータ、IaC エグゼキュータ)を追加する
チームは、同じガードが適用されるようそれに `workspace_requires: true` を設定
すべきです。CI では `AMADEUS_SKIP_ARTIFACT_GUARD=1` でバイパスします。

### `consumes[].required`

consume エントリごとの Boolean。セマンティックには **アクティブなプランに
スコープされ**、成果物が常にどこかに存在するというグローバルなアサーションでは
ありません:

> `required: true` は *「もし生成側のステージがアクティブなプランで実行されるなら、
> この consume は満たされねばならない」* を意味します。「生成側が常に実行される」を
> 意味 **しません**。スコープが生成側を除外する場合(例: `bugfix` は
> `units-generation` をスキップ)、その生成側の成果物のすべての `required: true`
> の consume は無意味になります — 要求すべきものが何もありません。

**なぜスコープされた読み方なのか。** `all` 実行スコープ(`enterprise`、
`feature`、`workshop`)を除くすべてのスコープは、上流ステージを意図的に
スキップします。フラットでグローバルな `required: true` は、それらのスコープを
構造的に無効にしてしまいますが、それは誤りです — それらは正当な動作モードです。
真の契約は条件付きです:「上流が実行されるなら、下流の私に供給せよ」。
ステージ本体はすでに不在のケースを優雅に扱います(「利用可能なら」のような
散文の指示や、コンテキストからのフォールバック)。

**これが doctor lint に意味すること。** lint は各アクティブスコープを辿り、
「ステージ X の成果物 Y に対する `required: true` の consume は、Y の生成側が
このスコープで SKIP なので無意味です」と報告します。それはアドバイザリであり、
ブロッキングではありません — ユーザーはスコープを選ぶことですでにその切り詰めを
オプトインしています。

**v0.10.0 が加えるもの。** 予約された `when:` プリミティブ(下記「予約」
セクション参照)は、著者がより豊かな述語を表現できるようにします —
`when: producer-in-plan`、`when: mode == brownfield`、`when: scope != poc`。
今日の `required: true` + `conditional_on: brownfield|greenfield` のペアは、
v0.3.0 が必要とする2つの次元をカバーします。`when:` はそれを一般化します。

### `consumes[].conditional_on`

ブラウンフィールド/グリーンフィールドの分岐を捉えます。例:
`reverse-engineering` はブラウンフィールドモードでのみ成果物を生成します。
それらの成果物を消費するステージは、consume に `conditional_on: brownfield` を
マークして、スコープリゾルバに「この consume はブラウンフィールドのときのみ必要」と
伝えます。

無条件の consume については、**フィールドを完全に省略します**。`always` 値は
ありません — 無条件の consume は単に `conditional_on` キーを持ちません。

### `mode`

ディスパッチ機構、3つの値:

- `inline` — コンダクターが自身のコンテキストでステージを実行する。短いステージ、
  実行が速く、コンテキスト圧迫がない。
- `subagent` — Task ツールを介して新鮮なサブエージェントコンテキストに委譲する。
  メインのコンダクターコンテキストを吹き飛ばしてしまう長いステージ(Construction の
  コード生成)。
- `agent-team` — **予約**。Anthropic の実験的な
  `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` プリミティブが安定化し、直接的な
  エージェント間メッセージングが必要になったときのため。最初の消費者はおそらく
  v0.8.0 の Ralph ループドライバです。v0.3.0 ではどのステージも `agent-team` を
  宣言しません。

注: 今日のマルチエージェント実行は `support_agents` を介して表現されます。
コンダクターはまずリードエージェントを呼び出し、次に各サポーターを、リードの出力を
コンテキストとして順に呼び出します(
`dist/claude/.claude/amadeus-common/protocols/stage-protocol.md:611` を参照)。エージェントは
互いを呼び出しません — コンダクターのみが委譲します。`agent-team` は、直接的な
エージェント間メッセージングが必要な将来のケース専用であり、一般的な「複数の
エージェントがステージに触れる」ケースではありません。

**消費者契約。** `mode` フィールドを読むオーケストレーターコードは、`agent-team` を
明示的に扱わねばなりません — 最低でも「mode agent-team not yet
implemented」を throw する。デフォルトの実行パスにフォールスルーしないこと。
enum 拡張時のサイレントなフォールスルーは既知の落とし穴です。

### `lead_agent` と `support_agents`

リードエージェントがステージを所有します。リードのペルソナ(スキル、ナレッジ、
ツール allowlist)はステージ開始時にロードされます。サポートエージェントは視点を
加えます — あるステージは要件作業のために `amadeus-product-agent` でリードしつつ、
キャパシティの現実チェックのために `amadeus-delivery-agent` をサポートとして
ロードするかもしれません。

両フィールドは `loadAgents()`(milestone 3 で導入)を介して `.claude/agents/*.md` に対して
動的に検証されます — `amadeus-graph.ts compile` が発見されたエージェント slug を
`validateStageFrontmatter` に渡すため、対応するファイルのないエージェントを名指しする
`lead_agent` や `support_agents` の値は、実行時に未登録サブエージェントの `Task`
エラーとして表面化するのではなく、コンパイルを声高に失敗させます
(`lead_agent "<name>" has no matching .claude/agents/*.md`)。唯一の例外は予約された
`orchestrator` 疑似エージェント(コンダクター自身、ブートストラップの initialization
ステージで `lead_agent` として名指しされる)です。それは設計上エージェントファイルを
持ちません。スキーマにハードコードされた enum はありません — エージェントを追加する
とは、必要なフロントマターを持つその `.md` ファイルを `.claude/agents/` に置くこと
です。[Contributing: Adding an Agent](11-contributing.ja.md#adding-an-agent) を参照。

### `reviewer` と `reviewer_max_iterations`

オプション。`reviewer` は、ステージ本体が成果物を生成した後、承認ゲートの前に
呼び出される品質ゲートエージェントを名指しします([Stage
Protocol](04-stage-protocol.md) を参照)。今日、2つの reviewer が出荷されています —
`amadeus-product-lead-agent` と `amadeus-architecture-reviewer-agent` — そして
コンパイルは `lead_agent` が検証されるのと同じ方法で、発見されたエージェント名簿に対して
その値を検証します。

`reviewer_max_iterations` は、ワークフローが未解決の指摘とともにゲートへ進む前の
review/revise ループに上限を設けます。`reviewer` が宣言されているが上限が与えられて
いない場合、**デフォルトは 2** です。コンパイラは欠落または非正の値を 2 に強制します。
`reviewer` を宣言しないステージではこのフィールドを省略してください: コンパイラは
`reviewer` なしで宣言された `reviewer_max_iterations` を拒否します(スキーマエラー
`reviewer_max_iterations requires a reviewer` がグラフコンパイルを失敗させます)ので、
暗黙のうちに無視されることは決してありません。

---

## エージェントフロントマターとの関係

ステージとエージェントは同じ YAML ファーストの規律に従います。エージェント
フロントマター([Agent System](05-agent-system.ja.md#frontmatter-contract) を参照)は
*誰* — エージェントの名前、許可されたツール、モデル上書き — を宣言します。ステージ
フロントマターは *何* — ステージがどの成果物を生成し消費するか、どのエージェントに
委譲するか、どう実行するか — を宣言します。

両フォーマットとも:

- 自ドメインの権威あるソースである(並行するハードコードされたマップはない)。
- 型付き構造を返す `loadX()` ヘルパーとともに出荷される。
- ハードコードされた enum に対してではなく、ファイルシステムに対して動的に検証する。

新しいステージを追加することは、新しいエージェントを追加することと同じ形です:
`.md` ファイルを置き、必要なフロントマターを追加すれば、ヘルパーが実行時に
それを拾います。

---

## 実例

正典の例は `scope-definition` です。規範的な YAML ブロックは
`dist/claude/.claude/amadeus-common/protocols/stage-definition.md` に存在します — ここで
複製するのではなく、そちらを参照してください。

この例は、今日の散文が記述するものを構造化された形でエンコードします:

- `requires_stage: [intent-capture]` は散文の指示「intent の
  `ideation/intent-capture/`(その record dir の下)から intent statement を読む」を
  エンコードします。パーサーは散文を気にしません — グラフエッジを見るだけです — が、
  人間の読者はそれらを同期させておくべきです。
- `consumes: [{artifact: intent-statement, required: true}]` は、このステージが
  `intent-statement` が存在するまでブロックされることを述べます。スコープの
  リゾルバが `intent-statement` の生成側を見つけられない場合、doctor の
  missing-producer チェックが失敗します。
- `produces: [scope-document, intent-backlog, scope-definition-questions]` は
  前方エッジです — 「誰が `scope-document` を生成するか?」を探す他のステージは、
  `amadeus-graph.ts producersOf()` を介してこのステージを見つけます。
- `for_each` フィールドなし — `scope-definition` はワークフローごとに1回実行されます。

---

## 3コンパートメントの本体モデル

ステージファイルの本体には3つのコンパートメントがあり、この順序で宣言されます。
v0.3.0 で populate されるのは `## Steps` のみです。

| コンパートメント | v0.3.0 | v0.5.0 | ここに入るもの |
|-------------|--------|--------|----------------|
| `## Steps` | 必須、populate 済み | 変更なし | エージェントが従う命令的な散文 |
| `## Sensors` | 予約、不在 | populate 済み | 決定論的なセンサーバインディング(フラットな `.claude/sensors/` レジストリからの ID) |
| `## Learn` | 予約、不在 | populate 済み | ループドライバのバインディングとオブザーバールール |

v0.3.0 で3つのコンパートメントを事前宣言しておいたことは、v0.5.0 の追加が
本体の再構築ではなくスロットインの変更であったことを意味しました。`## Sensors` の
バインディングセマンティクスとプルインポートモデルについては [Sensor
System](07-sensor-system.md) を参照。

**milestone 8 の移行ルール:** 既存の本体を `## Steps` の下でラップするだけで、
それ以外は何もしない。ほとんどのステージファイルはすでに `## Steps` を最初の本体
見出しとして使用しています。

---

## YAML 移行 — 出荷済み

milestone 7 は `lib.ts` に `parseStageFrontmatter` と `emitStageFrontmatter` を
出荷しました — YAML のみ、散文の後方互換パスなし。milestone 8 は31個すべての
ステージファイルを単一のアトミックな変更で YAML フロントマターへ移行しました。
milestone 9 は `amadeus-graph.ts` を拡張して YAML を `stage-graph.json` へコンパイルし、
CI ドリフトガードとして `compile --check` を追加しました。クリーンなツリーで
`bun amadeus-graph.ts compile --check` を実行すると 0 で終了します。任意のステージ
YAML を JSON を再コンパイルせずに編集すると、明確なメッセージとともに 1 で終了します。

---

## v0.3.0 における既知の制限

- **`for_each` は新しい。**`**Per-Unit**: Yes` を持つ5つの Construction ステージは
  `for_each: unit-of-work` へ移行します。他の26ステージはフィールドを完全に省略します。
- **Sensors / Learn コンパートメントは宣言されているが空。** パーサーはそれらの
  不在を許容します。v0.5.0 がそれらを populate しました([Sensor
  System](07-sensor-system.md) を参照)。
- **ドリフトチェック以上のランタイム検証はない。** パーサーは有効な `StageEntry` を
  生成する任意の YAML を受け付けます。doctor の後の拡張がその上にアドバイザリな
  rule/sensor チェックを加えます。

---

## 将来の拡張 — 予約された名前空間

仕様は、AI-DLC が後のリリースで追加する可能性の高いプリミティブのために名前を
予約します。スキーマは未知のキーを拒否します — ここで名前を予約しておくことで、
将来のコントリビューションがアドホックな追加と衝突するのを防ぎます。

| キー | 予想されるリリース | それが行うこと |
|-----|----------------|-----------------|
| `when` | v0.10.0 fitness compiler | 構造化された条件。`condition` の散文を機械で強制可能なロジックへコンパイルする。`consumes[].conditional_on` を置き換え、今日のスコープ認識な `consumes[].required` をより豊かな述語(`producer-in-plan`、`mode == brownfield`、`scope != poc`)で一般化する |
| `on_failure` | v0.8.0 Ralph loop | 宣言的なエラー回復 — 「このステージが失敗したら X へ戻れ」または「調整された入力でリトライせよ」。リビジョンのセマンティクスを `stage-protocol-recovery.md` の散文の外へ移す |
| `blocks_on` | v0.4.0 Construction(表面化される場合) | データ読み取りなしの完了依存 — 今日の過負荷な `requires_stage`(「あなたの出力を消費する」と「あなたの後に実行する」を混同している)を分割する |
| `timeout` | v0.5.0 sensor binding | 実行予算(締め切り)。ステージフロントマターではなくセンサーバインディングに配置される |
| `retry` | v0.8.0 Ralph loop | 失敗時のリトライポリシー。ステージフロントマターではなくループ設定に配置される |

設計の根拠: Claude Code 自身のタスクプリミティブ(TaskCreate ファミリーに加えて
`/loop` と cron)は、依存、ブロック、リトライ、タイムアウトを省いています — マルチ
ステップのオーケストレーションはすべてクライアント側のコードへ押し出されています。
この実装はその選択を反映し、実行挙動(リトライ、タイムアウト、失敗処理)を
ステージ仕様ではなくループとセンサーのサブシステムに配置します。上記のフィールドは、
消費者が現れれば控えめな構造的拡張であり、新しいパラダイムではありません。

予約された名前空間のパターンは、監査タクソノミー([State Machine](12-state-machine.ja.md))に
先例があります。そこでは、イベント名を Emitter セル `Reserved (v0.x PR N)` とともに
事前登録します — 名前はレジストリに存在しますが、消費者 PR が出荷されるまではどの
コードもそれを emit せず、その時点で同じコミットが `Reserved` マーカーを実際の
emitter パスに置き換えます。

---

## クロスリファレンス

- `dist/claude/.claude/amadeus-common/protocols/stage-definition.md` — 本章が
  ナラティブ化する権威ある仕様。
- [Stage Protocol](04-stage-protocol.ja.md) — ランタイム実行の挙動。
- [Agent System](05-agent-system.ja.md) — エージェントファイルの並行する YAML ファースト
  契約。
- [State Machine](12-state-machine.ja.md) — ステージ実行が監査イベントを emit する場所。
