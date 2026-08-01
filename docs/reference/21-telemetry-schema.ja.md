# Telemetry Schema Reference

> 言語: [English](21-telemetry-schema.md) | **日本語**

本章は Amadeus のテレメトリレコードが何を運ぶかを記述します。どの属性が
resource に載り、どれが span に載り、exception イベントが何を持ち、subagent の
区間がどう観測され、どの metric 計器が存在し、redaction がどこで走るかです。

**スキーマ自体は Issue #1868**(telemetry メタ情報スキーマ v1 を確定した裁定)が
正本です。本章はその着地済み実装の転記であり、第2の正本ではありません。両者が
食い違う場合は末尾の乖離解消規則に従います — 乖離は実装側か #1868 側で解消し、
本章で吸収することはありません。

以下の例値はすべて合成値です。パスはマスク後の形式(`<home>/…`)で示し、本章が
redaction 前の生値の見本を提供しないようにしています。

## Resource attributes

resource バッグはプロセスごとに一度組み立てられ、3シグナル(trace・log・metric)
が同一のバッグを読みます — シグナルごとにコピーを持ちません
(`otel/resource.ts:126-141` `buildResource`、`:155-161` `currentResource`)。

語彙は閉集合(`otel/resource.ts:61-65` `RESOURCE_ATTRIBUTE_KEYS`)であり、これが
resource 用 redaction ポリシーを allow-list として表現できる理由です。閉集合は
3群の和です: core が自身について計測するもの(`:43-52` `NEUTRAL_RESOURCE_KEYS`)、
git から計測する対(`:56` `VCS_RESOURCE_KEYS`)、ハーネスが供給しうるもの
(`otel/resource-suppliers.ts:22-27` `SUPPLIED_RESOURCE_KEYS`)です。

| 属性 | 型 | 供給元 | 省略条件 |
|---|---|---|---|
| `service.name` | string | 定数 `SERVICE_NAME`(`resource.ts:39`) | 省略なし |
| `service.version` | string | `AMADEUS_VERSION`(`resource.ts:129`) | バージョン定数が読めないとき |
| `telemetry.sdk.language` | string | 定数 `TELEMETRY_SDK_LANGUAGE`(`resource.ts:40`) | 省略なし |
| `deployment.environment.name` | string | `GITHUB_ACTIONS`/`CI` 判定で `ci`、それ以外は `local`(`resource.ts:100-102`) | 省略なし |
| `host.name` | string | `os.hostname()`(`resource.ts:132`) | ホスト名が解決できないとき |
| `amadeus.clone_id` | string | `auditCloneId` — 監査シャードを識別するものと同一(`resource.ts:133`) | clone id が解決できないとき |
| `amadeus.operating_mode` | string | `AMADEUS_OPERATING_MODE`、既定は `solo`(`resource.ts:134`) | 省略なし |
| `amadeus.harness` | string | `detectHarnessType()`(`resource.ts:135`) | ハーネスを検出できないとき |
| `vcs.ref.head.name` | string | `git rev-parse --abbrev-ref HEAD`(`resource.ts:111-121`) | work tree でないとき — revision と同時に省略 |
| `vcs.ref.head.revision` | string | `git rev-parse HEAD`(`resource.ts:111-121`) | work tree でないとき — branch と同時に省略 |
| `amadeus.harness.version` | string | ハーネス供給 seam | 供給がないとき |
| `gen_ai.request.model` | string | ハーネス供給 seam | 供給がないとき |
| `session.id` | string | ハーネス供給 seam | 供給がないとき |
| `amadeus.agent.role` | string | ハーネス供給 seam | 供給がないとき |

`telemetry.sdk.language` は #1868 §1 の表より前から存在し、同 Issue では「現状
実測」の記述としてのみ触れられています。スキーマ v1 以前から resource に載って
いた OTel 標準キーであり、そのまま維持されています。

### 解決規則

- **属性ごとの fail-open。** 各属性は自分の `try` の下で解決されます
  (`resource.ts:89-98` `put`)。計測できない属性はバッグから*不在*になります —
  `null` でも空文字列でもありません。存在で絞り込む消費側が「どの空値が不明を
  意味するか」まで知らずに済むためです。
- **vcs の対は1ステップで解決します**(`resource.ts:111-121`)。head revision を
  答えられないディレクトリは branch も答えられず、片側だけの報告は観測されて
  いないチェックアウトを記述することになります。
- **供給は両軸で fail-closed です**(`resource-suppliers.ts:49-64`)。閉集合外の
  キーは throw、同一キーの2度目の供給は上書きせず throw、空値も throw します —
  不明な属性の fail-open な形は空文字列ではなく不在だからです。
- **バッグはスナップショットでなくメモ化 getter 経由で読みます**
  (`resource.ts:155-161`)。ハーネスは providers が立った後に属性を供給しうる
  ため、読み手は generation カウンタ(`resource-suppliers.ts:76-78`)を参照し、
  供給が着地していれば組み立て直します。

## Span attributes

すべての span は、それが属する作業単位の文脈を運びます。intent や stage で span
を束ねるのに trace id で監査ジャーナルへ join し直す必要をなくすためです。語彙は
閉集合で、それを許可する allow-list の隣で定義され
(`otel/redaction.ts:80-87` `SPAN_CONTEXT_ATTRIBUTE_KEYS`)、resolver から
再エクスポートされます(`otel/span-context.ts:31`)。

| 属性 | 型 | 供給元 | 省略条件 |
|---|---|---|---|
| `amadeus.intent` | string | `activeIntent`(`span-context.ts:57-63`) | cursor が解決しないとき — space と同時に省略 |
| `amadeus.space` | string | `activeSpace`(`span-context.ts:57-63`) | cursor が解決しないとき — intent と同時に省略 |
| `amadeus.stage` | string | active intent の state ファイルの `Current Stage`(`span-context.ts:76`) | state ファイル不在、または当該フィールド不在 |
| `amadeus.phase` | string | 同じ state ファイルの `Lifecycle Phase`(`span-context.ts:77`) | state ファイル不在、または当該フィールド不在 |
| `amadeus.agent.type` | string | `AMADEUS_AGENT_TYPE`(`span-context.ts:88`) | 未設定または空のとき |
| `amadeus.agent.id` | string | `AMADEUS_AGENT_ID`(`span-context.ts:89`) | 未設定または空のとき |

### 解決規則

- **intent/space の対は1ステップで解決します**(`span-context.ts:57-63`)。space
  単独では作業単位を記述しません — intent が住む容器にすぎない — ため、intent の
  ない space を持つバッグは、intent 不明のまま workspace 単位で span を束ねる
  ことを消費側に許してしまいます。
- **ジャーナルがフォールバックする箇所で、span は両キーを省略します。** これは
  見落としではなく意図的相違です: 監査行は何らかの台帳を必ず名指す必要があるた
  め、cursor が解決しないときジャーナルは `workspace` を刻みます
  (`otel/logger-provider.ts:94`)。span 属性にその義務はなく、intent で束ねる
  消費側に「どの intent も記述しないフォールバック名のバケツ」を渡してはなりま
  せん。
- **想定外の失敗は部分文脈でなく文脈なしへ縮退します**(`span-context.ts:90-96`)。
  キーは対で解決され、対の半分は観測されていない作業単位を記述するためです。
  span 生成はいずれの場合も継続します。
- **解決はプロセスごとに一度です**(`span-context.ts:111-116`)。Amadeus のツール
  は短命 — 1プロセスが1 intent の1ステージを担って終了する — であり、span end は
  hot path です。メモは workspace をキーとするため、1プロセスで複数の fixture
  workspace を駆動しても、2つ目を1つ目のメモで答えることはありません。
- **明示的な span 属性が文脈より優先されます。** レコードは文脈を先に、span 自身
  の属性を後にマージするため(`otel/tracer-provider.ts:155`)、呼出し側が文脈キー
  を明示設定した場合は resolver に上書きされません。

subprocess span の `Command` / `ExitCode` はスキーマ v1 以前からのもので無改変です。

## Exception events

`span.recordException()` は OTel semantic convention の `exception` span イベント
を生成します(`otel/event-registry.ts:83` `EXCEPTION_SPAN_EVENT_NAME`)。分類は
**telemetry** 固定で canonical にはなりません(`event-registry.ts:839-854`): この
イベントは span レコードに乗り、監査ジャーナルへは到達しません。canonical な失敗
は別途 `amadeus.operation.failed` が担います。この分類は不変条件であり、
`recordException` は実行時に再確認して、registry 定義が再分類されていれば throw
します(`otel/tracer-provider.ts:172-175`)。

| 属性 | 要求度 | 供給元 | 省略条件 |
|---|---|---|---|
| `exception.message` | required | throw された値の message、`Error` 以外は `String(value)`(`tracer-provider.ts:176`) | 省略なし |
| `exception.type` | optional | `err.name`(`tracer-provider.ts:188`) | throw された値が `Error` でないとき |
| `exception.stacktrace` | optional | `err.stack` を redaction したもの(`tracer-provider.ts:190`) | `Error` でない、または stack を持たないとき |

2つの随伴属性が required でなく optional なのは、`Error` 以外の throw 値はどちらも
持たず、`Error` でも stack を持たない場合があるためです。required にすると、記録
された失敗が第2の失敗に変わってしまいます。

### Stacktrace の redaction

生の stack は全フレームでマシンのユーザー名とディレクトリ構成を名指すため、捕捉
したままでは保存できません。`redactStacktrace`(`otel/redaction.ts:197-202`)は
パス様のトークンをすべて3つの有界形式のいずれかへ書き換え
(`redaction.ts:180-189` `rewritePathToken`)、結果を credential scrub します。

| ゾーン | 書換え後の形式 | 規則 |
|---|---|---|
| リポジトリ内 | repo 相対(`packages/framework/core/otel/…`) | 最初に試す: repo は通常ホーム配下にあり、相対形式のほうが home マスク形式よりフレームの特定に有用 |
| ホームディレクトリ配下 | `<home>/…` | repo 相対にならなかった場合に適用 |
| それ以外 | `<external>/…` | フォールバックのゾーンマーカー |

パターンは1つの文字クラスに1つの量指定子(`redaction.ts:174`)であり、入力がどれ
ほど敵対的でも1回の線形走査で照合が済みます。自身が出力するマーカーも認識する
ため書換えは冪等です — 2回目の走査は `<home>/x` を書換え済みの1トークンとして
扱います。

これは write-time で redaction される唯一の `addEvent` 経路であり、redaction 自体
が throw した場合は message のみのイベントへ縮退します
(`tracer-provider.ts:193-196`)。

## Subagent observability

subagent の区間は2つの canonical イベントとして観測され、後段の read-only な
post-process で突合されます。両者は canonical な監査語彙の一部で、その cardinality
は drift guard が固定しています(`otel/event-registry.ts:77`
`EXPECTED_CANONICAL_COUNT`)。

| イベント | 監査イベント | required | optional |
|---|---|---|---|
| `amadeus.subagent.started` | `SUBAGENT_STARTED` | `Agent Type` | `Agent ID`、`Purpose` |
| `amadeus.subagent.completed` | `SUBAGENT_COMPLETED` | `Agent Type` | `Agent ID`、`Message` |

出典: `event-registry.ts:475-496`。

### started 側の属性がほぼ optional である理由

ハーネスは subagent が*いつ始まるか*について一致しておらず、属性の optional 性は
その非対称性から直接導かれます(`hooks/amadeus-log-subagent-start.ts:8-16`)。

| ハーネス | start seam | 帰結 |
|---|---|---|
| Claude Code | dispatch ツールへの `PreToolUse` | hook が*すべての*ツールで発火するため、フィールド導出は dispatch ツール `Task` 以外を拒否する(`tools/amadeus-lib.ts:4430`、`:4456-4457`) |
| Kimi | prompt を運ぶ専用の `SubagentStart` イベント | `Purpose` の導出元となる prompt を供給する |
| Codex、Cursor、OpenCode、Kiro、Kiro IDE | なし | completed 側のみを発火する |

2つのペイロード形状が1つの導出に収束します(`amadeus-lib.ts:4456-4467`): ツール
エンベロープは `subagent_type`/`prompt` を `tool_input` の内側に運び、専用の start
イベントはそれらを最上位に運んで tool 名を持ちません。

`Purpose` は **dispatch prompt から導出した*ラベル*であり、prompt の転記ではあり
ません**(`amadeus-lib.ts:4437-4442`): エスケープされた改行をまず正規化し、次に
1行目を取り、trim し、制御文字を除去し、`SUBAGENT_PURPOSE_MAX_LENGTH`
(`amadeus-lib.ts:4425`)で長さを制限します。エスケープの正規化を先に行うことが
本質的です — リテラルの `\n` を含んで届いた prompt は、さもなければ単一の「行」と
なり、本文を監査行へ持ち込んでしまいます。

両側は同じ発火ゲート(TTY でないこと、active intent の監査シャードが存在すること、
ワークフローが終端状態でないこと)を共有するため、completion が捨てられる状況で
start だけが記録されることはありません。

### Lifetime の合成

`composeSubagentLifetimes`(`otel/subagent-lifetime.ts:111-171`)はジャーナル
レコードから区間を導出します。何も書かず、何も変更しません: ジャーナルが正本で
あり、これはその派生ビューの1つです。

突合は2段です(`subagent-lifetime.ts:97-109`)。

1. **完全一致** — 両側の `Agent ID` が非空で等しい場合。曖昧さがないため、位置に
   依らず最初に解決します。
2. **型による greedy** — *どちらかの側に id が無い*場合にのみ適用します(それが
   そもそも id を判断材料にできない理由です)。同一型の未突合 start のうち最も
   新しいものを選びます(同時刻は clone ローカルの seq 降順で決着)。同一型の
   subagent は交錯するより入れ子になることが多いためです。両側が id を持ち、かつ
   異なる場合は、ハーネスが「別の agent だ」と告げているので突合しません。

start は高々1回しか消費されないため、N 個の completion が N を超える lifetime を
作ることはありません。未突合の2つの側は意図的に非対称です。

| 未突合の側 | 扱い | 理由 |
|---|---|---|
| start のない completion | 破棄 | 多くのハーネスは start seam を持たず、これは正常な定常状態。start を合成すると、起きていない区間をレコードへ入れてしまう |
| completion のない start | `incomplete: true`、`completedAt` と `durationMs` は null として報告 | 開始して完了しなかった subagent こそ、この半分が運ぶべきシグナル。区間は瞬時ではなく*不明*なので 0 ではなく null |

start より前の completion(clone 間のクロックスキュー)は、負値で報告せず 0 へ
クランプします(`subagent-lifetime.ts:85-90`)。

## Metrics instruments

計器カタログは閉集合で、記述箇所は1つです(`otel/metrics-vocabulary.ts:22-48`
`INSTRUMENTS`)。名前の union、名前リスト、redaction ポリシーの次元集合はすべて
そこから導出されます。

| 計器 | 種別 | 次元 | 記録関数 | 導出元 |
|---|---|---|---|---|
| `gen_ai.client.token.usage` | histogram | `gen_ai.token.type`、`gen_ai.request.model` | `recordTokenUsage`(`metrics-instruments.ts:83-94`) | ハーネス供給 seam — Amadeus のプロセスは LLM 呼出しを見ない |
| `amadeus.stage.duration` | histogram | `amadeus.stage`、`amadeus.phase` | `recordStageDuration`(`metrics-instruments.ts:60-65`) | `amadeus.stage.started` ↔ `amadeus.stage.completed` |
| `amadeus.gate.iterations` | counter | `amadeus.stage` | `recordGateIteration`(`metrics-instruments.ts:67-69`) | `amadeus.stage.revising` |
| `amadeus.operation.failures` | counter | `amadeus.operation` | `recordOperationFailure`(`metrics-instruments.ts:71-73`) | `amadeus.operation.failed` |
| `amadeus.subagent.duration` | histogram | `amadeus.agent.type` | `recordSubagentDuration`(`metrics-instruments.ts:75-77`) | `amadeus.subagent.started` ↔ `amadeus.subagent.completed` |

token usage は2次元の1レコードではなく、同一 histogram への2観測として記録します。
`gen_ai.token.type` は GenAI conventions が input と output を分ける次元であり、
両方を1レコードに載せると報告すべき正直な値が存在しなくなるためです。取りうる
2値は固定されています(`metrics-vocabulary.ts:74` `TOKEN_TYPES`)。

5計器のうち4つは canonical イベントからルックアップ表経由で導出されます
(`metrics-instruments.ts:173-210` `DERIVATIONS`)。`amadeus.gate.iterations` は
rejection ではなく *revising* 行を数えます。rejection と revision は対で発火する
ため、revision を数えることで各 rejection を1回だけ数えられるからです。
`amadeus.operation.failures` は低カーディナリティな `Tool` 属性を使います —
`Command` は argv 由来であり、呼出しごとに独立の系列を作ってしまいます。

### cardinality が要点

metric の属性は次元です: 値が1つ増えるごとに保存される系列が乗算されます。よって
語彙は計器ごとに閉じられ、集合外のキーは黙って落とされるのではなく不変条件違反と
して throw します(`metrics-vocabulary.ts:89-105` `admitInstrumentAttributes`)。
intent id と agent id は metric の次元では**ありません** — それらが与える相関は
trace/log 側の担当です。解決できなかった次元は落とされます。これが不明な次元に
対する fail-open な形です。

すべての計測呼出し点を3つの規則が支配します(`metrics-instruments.ts:1-29`)。

1. **Meter が無ければ計測しない。** metrics arm を立てていないプロセスは何も記録
   しません — 呼出し点は meter を要求せず登録有無を尋ねるため、監査行だけを書く
   CLI が計測点を通っただけでクラッシュしません(`metrics-instruments.ts:48`)。
2. **計測は呼出し側の制御フローを変えない。** meter や store の異常はすべて
   「記録なし」へ縮退します(`metrics-instruments.ts:51-57`)。
3. **cardinality は `try` の前で閉じる。** 集合外の属性はインフラ障害ではなく
   呼出し側のバグなので、著者に見える場所で throw します
   (`metrics-instruments.ts:50`)。

duration はプロセス境界を跨ぎます — ステージはある CLI 実行で始まり別の実行で
完了します — ため、開始時刻は Signal Store の隣に1行のマーカーとして置かれ、完了
側のプロセスが消費します(`metrics-instruments.ts:105-141`)。マーカーは消費時に
削除されるため、2度目の completion が同じ区間を再計測することはありません。また
マーカーを見つけられなかった完了側は、エラーとせず計測を行いません。

## Redaction layers

redaction は**2層**で走り、1つのポリシーインスタンスを共有します: write time
(provider の emit 経路)と export 境界(各 exporter と Relay、レコードが出て行く
直前)です。したがって emit 経路を迂回した呼出し側であっても機微データを Signal
Store へ置くことはできず、ポリシー強化前に書かれたレコードが無フィルタでマシンを
出ることもありません。

| 層 | 場所 | 呼出し点 |
|---|---|---|
| write time | canonical / diagnostic の emit | `logger-provider.ts:128`、`:163` |
| write time | resource 組み立て | `resource.ts:140`(`redactResource`) |
| write time | exception イベント | `tracer-provider.ts:192` |
| export 境界 | span store | `local-span-exporter.ts:92-104`(適用は `:119`) |
| export 境界 | log store | `local-log-exporter.ts:94-99` |
| export 境界 | metric store | `local-metric-exporter.ts:78-80` |
| export 境界 | OTLP Relay | `relay.ts:231-233`、`:310` |

admission は **default-deny** です(`redaction.ts:152-162` `redactAttributes`):
safe key と明示 opt-in key のみを通し、通したすべての値を credential scrub します。
opt-in は生の素通しを意味しません。このパスは冪等で入力を変更しないため、2層が
安全に合成されます。

### safe key の3層

本番の safe key 集合(`redaction.ts:89-123` `DEFAULT_REDACTION_POLICY`)は手書き
リストではなく3つの語彙から導出されます。新しい属性が保存レコードから黙って
食われることを防ぐためです。

| 層 | 導出元 | 掲載が必要な理由 |
|---|---|---|
| registry 語彙 | 登録済み全イベントの required *および* optional 属性(`redaction.ts:66-72`) | それらは設計上の監査フィールド。required 側だけを取ると、optional キーが保存行から消えたまま append は成功と報告された |
| span 文脈 | `SPAN_CONTEXT_ATTRIBUTE_KEYS`(`redaction.ts:111`) | canonical イベントがこれらを宣言しないため registry 由来のベースラインでは許可できず、default-deny により store と Relay の境界で落ちてしまう |
| metric 次元 | `INSTRUMENT_ATTRIBUTE_KEYS`(`redaction.ts:117`) | 掲載しないと default-deny が測定値からすべての次元を剥ぎ取ったうえで append を成功と報告してしまう |

これらに加えて、registry 語彙より前から存在する低カーディナリティの運用キーと、
監査 exporter が付与しうる相関 id が並びます。

opt-in キーは `Command` のみです(`redaction.ts:121`)。これは
`amadeus.operation.failed` の required 属性のため落とせず、scrub される opt-in 層
だけで許可することで、argv 由来の値が credential を含んだまま保存されないように
しています。

### Credential scrubbing

1つのコンパイル済みパターン語彙(`redaction.ts:36-46`
`CREDENTIAL_SCRUB_PATTERNS`)を、2つの redaction 層と credential-free の CI ゲート
が共有します。二重メンテナンスの対象を作らないためです。各パターンは安定した
ラベルを持ち、ゲートは一致した秘密ではなくラベルを報告するため、CI ログが
credential を反響しません(`redaction.ts:207-215` `scanForCredentials`)。一致部は
固定長・ラベルなしのマスク(`redaction.ts:50`)へ置換され、秘密の形状の手がかりを
残しません。scrub は入れ子の JSON 値へ再帰します(`redaction.ts:127-146`)。

resource バッグは自身のポリシーを持ちます(`resource.ts:74-78`)。allow-list は
閉じた resource 語彙です: 既定ポリシーは registry のイベント属性を許可しますが、
それらは resource キーと重ならないため、既定ポリシーでバッグを redaction すると
バッグが空になってしまいます。default-deny は維持され、core の外から来る自由文で
ある供給値も scrub されます。

失敗経路も redaction の例外ではありません: 破棄された diagnostic は、名前と理由を
scrub した注記だけを残し、属性は一切残しません(`local-log-exporter.ts:68-77`)。

## 本章を実装と一致させ続ける

スキーマの正本は Issue #1868 であり、本章は実装からの転記です。乖離を見つけた
場合は次のとおり解消します — **本章で吸収してはなりません**。

| 状況 | 解消 |
|---|---|
| 実装が #1868 と一致 | 実装から転記する(正常系) |
| 実装が #1868 と乖離しており、それが欠陥 | 実装を直す。本章は #1868 準拠のまま |
| 乖離が意図的 — 実装時に判明した設計改善 | 先に #1868 を改訂し、改訂後のスキーマを本章へ転記する |
| #1868 が承認済み要件と乖離 | 上流逸脱としてエスカレーションする。コード側でも本章でも解消しない |

本章へ追記する際は実装をファイルと行で引用し、執筆時点のソースに対して各引用を
実測確認してください。
