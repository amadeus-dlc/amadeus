# Intent autonomy・レビュー・完了

> 言語: [English](24-intent-autonomy.md) | **日本語**

Amadeus の autonomy は1つの Intent にスコープされます。Intent はモードを持ち、
`full` ではさらに、その Intent のためだけに人間が発行したグラントを持ちます。
通常なら人へ問う対話へエンジンが到達したとき、モードとグラントが「自力で答えて
よいか」を決めます。答えた場合、その回答は不変の auto decision として記録され、
人間が事後にレビューできます。

本章はその機構を端から端まで扱います。モードとグラント、質問の裁定方法、
append-only なレビュー面、完了 Intent を閉じる seal、そしてこれら3つが共有する
harness registry です。監査イベントの表と各イベントの emitter は
[State Machine](12-state-machine.ja.md) を参照してください。本章はそれらの
イベントが何を意味するかを説明します。

## モードとグラント

モードは3値で、Intent の autonomy projection
(`packages/framework/core/tools/amadeus-intent-autonomy.ts`)が保持します。

interaction kind は `stage-gate` / `phase-gate` / `walking-skeleton` / `question`
の4種で、モードはそのうちどれを自分で裁定するかで定義されます。

| モード | 人間なしで裁定できる範囲 |
| --- | --- |
| `none` | なし。すべてのゲートと質問が `human-required` です。 |
| `semi` | `full` が裁定するもののうち、`phase-gate` と `walking-skeleton` の2つの節目を除いた全部。かつモード自体が人間コマンドで設定されている場合だけです。 |
| `full` | 4種すべて。現在のグラントの scope の範囲で裁定します。 |

`semi` の許可集合は手書きのリストではなく、節目 2 種の補集合として計算されます。
そのため5つ目の interaction kind を足しても、どちらのリストも編集せずに
semi 裁定可能になります。節目の線は scope とは独立に効くので、`phase-gate` を
名指した scope を `semi` に渡しても、その節目が裁定されることはありません。

ある kind を裁定できることと、決して止まらないことは別です。ユーザー専権の
裁定点と、選択肢を一意に絞れなかった導出は、`full` を含むどのモードでも人間へ
渡ります([モードが裁定できないとき](#モードが裁定できないとき)を参照)。

モードは Construction のスケジューリングにも投影されます。`Construction Autonomy Mode`
は Intent モードから1つの関数で導出され(書き手とスケジューラが同じ関数を呼ぶ
— `none` → `gated`、`semi` / `full` → `autonomous`)、`semi` は Bolt swarm を
無人で走らせます。2つのフィールドが食い違う record は、低いほうを黙って採用
するのではなく loud に拒否されます。

`none` が既定であり、legacy または読解不能な projection の着地先でもあります。
人間由来でない2つの provenance(`system-default` と `legacy-fail-closed`)は
いずれも `none` へ解決するため、Intent が偶然 autonomy を獲得することはありません。

モードの設定は `amadeus-bolt.ts set-autonomy` で行います。`full` はさらに、
表示されたグラントが実際の human turn で確認されることを要求します。まず preview し、
表示された digest を渡し返します。

```
bun .claude/tools/amadeus-bolt.ts preview-autonomy
bun .claude/tools/amadeus-bolt.ts set-autonomy --mode full \
  --confirmed-display-digest sha256:...
```

### 起動時にモードを宣言する

`set-autonomy` は正準の記録経路ですが、Intent が既に存在していることを前提とします。
`--autonomy <none|semi|full>` は同じ宣言を起動の一部として記録します。Intent を
誕生させる起動でも有効です。

```sh
/amadeus --autonomy semi 公開 API にレート制限を追加する
/amadeus --autonomy none
```

このフラグは記録の**手段**を追加するものであり、権限の出所ではありません。受理
されるのは**最初の**宣言のときだけ — モードの provenance がまだ `system-default`
である間に限られる — ため、人間が既に設定したモードを上書きすることはできません。
同じモードを再指定した場合は no-op、異なるモードを指定した場合は拒否され
`set-autonomy` を案内します。`none` と `semi` は唯一の正準書込経路を通ります。
誕生直後の Intent には引用できる自身の監査履歴がないため、宣言は起動時のキー
ストロークの human turn へ束縛されます。実 human turn を伴わない起動は明示的に
拒否され、Intent はモード未設定のまま成立し、最初の宣言は依然として可能なままです。

`--autonomy full` は受理されますが適用されることはありません。`full` の付与は上記の
儀式そのものであり、起動フラグがそれを代替することはできません。実行はグラントを
発行する2つのコマンドを表示してそこで停止します。アクティブなグラントがある状態で
`none` を求める起動も同様に拒否されます。グラントの取消はフラグの副作用ではなく
意図的な行為だからです。

グラントはグローバルなスイッチではありません。Intent uuid、発行時点の scope /
norm fingerprint、対象となる対話種別(`stage-gate`・`phase-gate`・
`walking-skeleton`・`question`)、明示的に禁止する effect 分類を持つ scope
descriptor を運びます。認可は occurrence をその scope と突き合わせます。Intent の
不一致、実行中でない workflow、scope 外の対話種別は、いずれも裁定へ落ちるのではなく
理由 `SCOPE_OUT` の `human-required` を返します。

effect は分類されています。自律的な authority が行使してよい2分類 —
`workflow-reversible` と `advisory-deferral`(プラグイン宣言の advisory を延期
する分類。以前は `quality-waiver` を借用していましたが、専用の分類になりました)
— は1つの共有リストから両方の認可 arm が読みます。そして5つの分類はグラントでは
決して認可できません。
`new-permission`・`irreversible`・`scope-out`・`norm-waiver`・`quality-waiver` です。
payload が記録済み fingerprint と一致しない effect や、適用 norm fingerprint が
動いた effect は `PAYLOAD_MISMATCH` / `NORM_DRIFT` として拒否されます。したがって
autonomy は、モードにかかわらず自身の権限を広げること・品質を waive すること・
不可逆な操作を行うことができません。

## 質問を裁定する

`semi` / `full` でのゲート裁定は直接的です。根拠はモード provenance または
グラント自身であり、decider は決定的エンジンです。

`semi` / `full` での *質問* は順序付き解決を通ります。この順序自体が要点で、より
安価でより権威ある根拠から順に参照されます。ただしその前に、まず1つ問われます。

0. **この裁定点はユーザー専権か?** 仕様変更、goal 改訂、選挙 hold、常任委任の
   条件を外れたマージ。専権の裁定点はここで確定するため、どれほど一致した根拠が
   あっても自動裁定されません。この述語はモード authority のもので、ラダーは
   問い合わせるだけです。

1. **確認済みポリシー** — グラント発行時に人間が事前確認した回答。
   `--policies-file` から `{sourceText, selector, optionId}` として供給します。
2. **norm** — 現在の norm fingerprint 下で selector に合致する norm fact。
   2つの norm fact が別の選択肢を指す場合、解決は推測しません。`NORM_CONFLICT` で
   workflow を park します。
3. **history** — 同じ scope 系譜と norm fingerprint の下での、同一 selector に
   対する過去の人間裁定。
4. **solo election** — capability が利用可能な場合。
5. **agent recommendation** — solo election が利用不能な場合に限り、記録には
   degraded capability とその理由が刻まれます。

いずれの分岐も、選択された option が occurrence の実提示分であること、evidence
fingerprint が実 digest であることを検証します。それ以外は裁定ではなく `invalid`
です。

駆動は `decide-question` verb で行い、occurrence とその文脈を JSON 文書として
渡します。

```
bun .claude/tools/amadeus-bolt.ts decide-question --input question-decision.json
```

結果は `AutoDecisionRecord` です。decision id・occurrence id・質問と提示した
option id 群・選択された option・decider・basis kind とその fingerprint・
principal と actor・grant id・degraded capability の有無・review state を持ちます。
これは Intent autonomy トランザクション内で `AUTO_DECIDED` として emit され、
トランザクションは atomic に commit されます。

段 4 と 5 は、常に選択肢を返すのではなく3値の語彙で答えます —
`unique(optionId, basis)` / `contested(候補, 事由)` / `none(事由)`。option id を
運ぶのは `unique` だけで、これが「根拠なしに裁定する」を表現不能にしています。
したがって最後の段に到達したことは、それでも答えてよいという許可ではありません。
選択肢を一意に絞れないエージェントは `contested` か `none` を返し、裁定は人間へ
渡ります。過去の人間裁定どうしが食い違う場合も同じ終端です — その食い違いこそ
最も裁定を要する状態なので、選挙やエージェントへ下ろしません。

## モードが裁定できないとき

裁定を人間へ返す終端は2つです。専権の裁定点(段 0)と、一意に絞れなかった導出
(`contested` / `none`)。その次に何が起きるかを決めるのはモードではなく
セッションです。

- **対話** — この clone 自身の監査シャードに `HUMAN_TURN` が 1 件以上ある。
  エンジンは outcome を載せた `human-required` を返し、conductor はその候補と
  事由をそのまま提示してターンを終えます。
- **非対話** — 1 件もない。エンジンは **waiting**(`AWAITING_RULING`)へ入り、
  occurrence・basis fingerprint・完全な事由を保持するトランザクションを名指した
  終端 `waiting` directive を出します。`/amadeus --resume` が同じ裁定を(言い換え
  ではなく)再提示できるのはこのためです。

対話判定はセッション単位で、呼ぶたびにディスクから読み直します。したがって
セッション途中で着地した `HUMAN_TURN` は次の呼び出しで観測されます。鮮度
ウィンドウも TTY 判定も宣言フラグもありません(3つとも検討のうえ棄却)。解決の
失敗(active intent 不在、シャード欠落、行の破損)はすべて非対話へ fail-closed
します。この判定は過少申告しかせず、ディスクにない turn を捏造することはありません。

`waiting` は独立した stop reason であり、`AWAITING_HUMAN`(認可の不足)、
`REPAIR_STALLED`(欠陥による停止)、`USER_PARKED`(誰かが止めることを選んだ)とは
区別されます。4つのうち2つでも混同すれば、「壊れている」と「答え待ち」が同じ
再開経路をたどってしまいます。同一 waiting キーへの繰り返し到達には rate 制約が
あり、制約は人間か repair へエスカレートします —「上限を超えたから続行」は
表現可能な結果ではありません。

park はモード非依存です。旧ガードは、autonomous な Construction 投影の下で未消費
の `HUMAN_TURN` が記録にないとき park を拒否していました(無人実行には再開する
人間がいない、という前提)。しかし、裁定できない裁定点に達した無人実行こそ止まる
べき実行です。したがってこの拒否は撤去され、mode arm もフラグも env の
off-switch もありません。presence の**会計**は不変です — `WORKFLOW_PARKED` は
いまも presence resolution なので、park は残っていた turn を消費します。

## remote write の承認境界

remote write とは、他の人と共有する面を変える操作です。push、PR の作成、
レビュースレッドへの返信・resolve、Issue の起票がこれにあたります。各ステージは
これらを長らく「ワークスペースの承認境界」へ委ねてきましたが、その境界はどこにも
書かれていませんでした。この節がその境界の定義です。

境界は常設の権限でも、ワークスペースの好みでもありません。`none` では他の質問と
同じく人間に尋ねます。`semi` / `full` では、人間へ直接尋ねることも、グラントを
根拠に実行することもしません。他のステージ質問とまったく同じように occurrence を
`decide-question` へ通します。裁定は梯子が行い、根拠とともに `AUTO_DECIDED` として
記録され、`human-required` が返った場合にのみ人間へ回ります。

梯子を経由してもグラントの認可範囲は広がりません。グラントが決して認可できない
5分類はそのまま適用されるため、occurrence が `irreversible` や `new-permission` と
分類する remote write は、裁定されるのではなく `human-required` として返ります。

merge はこの経路には乗りません。merge は常に人間専権であり、その PR について
人間に尋ねたうえで下す別個の判断です。収束 verdict もグラントも梯子の裁定も、
merge を認可しません。ワークスペースのノルムが常任マージ委任を持つ場合、それを
行使するのは当該ノルムの下の人間であり、エンジンの役割はそれを**記録**することです。
`amadeus-merge-provenance record` が、委任の根拠となった standing ruling 参照・
CI conclusion・収束 digest とともに `DELEGATED_MERGE_RECORDED` を emit します。
この記録ツールは mode arm ではありません — エビデンスは呼び出し側の申告をその
まま受け取り、git にも GitHub にも触れず、どの Intent モードもマージを自動化
しません。

## auto decision をレビューする

auto decision は不変です。レビュー面(`amadeus-autonomy-review.ts` と、その本番
audit アダプタ `amadeus-autonomy-review-production.ts`)はそれらに対する
**append-only な projection** です。レビューは裁定済み effect を再実行せず、
グラントを変更せず、Intent を再開せず、是正 Intent も作りません。既に起きたことに
対する人間の読みを記録するだけです。

各 decision は review state — `not-applicable`・`unreviewed`・`accepted`・
`flagged` — を持ちます。列挙とフィルタは次のとおりです。

```
bun .claude/tools/amadeus-bolt.ts list-auto-decisions --state unreviewed
```

レビューの commit は2段階の確認です。人間が「何を証言しようとしているか」を正確に
見られるようにするためです。まず意図する choice を添えて detail を要求すると、面は
decision とそのコマンドの digest を返します。

```
bun .claude/tools/amadeus-bolt.ts get-auto-decision --decision <id> --choice flag \
  --classification contract-defect
```

続いて digest を渡し返して commit します。

```
bun .claude/tools/amadeus-bolt.ts review-auto-decision --decision <id> --choice flag \
  --classification contract-defect --confirmed-review-digest sha256:...
```

preview の digest と commit 時に検証される digest は同一の export 済みヘルパーで
計算されるため、表示値と検査値が drift することはありません。flag の分類は
`contract-defect`・`specification-change`・`unspecified` のいずれかです。note は
生テキストではなく digest として運ばれ、detail projection は withheld / redacted の
フィールドを無言で省略せず明示します。

commit は `AUTO_DECISION_REVIEWED` を append します。この経路の唯一の書き手は
本番アダプタであり、書き込みには audit ロックを取ります。

### 完了境界のサマリ

`full` は節目も裁定するため、人間が未レビューのキューを一掃していた phase
boundary という場が失われます。その代わりに、終端完了時に record へ
`completion/auto-decision-summary.md` が書かれます。内容は `AUTO_DECIDED` 行の
総数、basis kind 別と review state 別の内訳、および audit 行数と列挙件数が
食い違う場合のカウント不一致です。どの数値も `AUTO_DECIDED` の監査証跡と既存の
レビュー列挙 API から読み取られ、起草されるものはありません。この工程は
best-effort で、失敗は完了をブロックせず completion JSON の警告になります。

## completion seal

Intent が終端状態へ達したとき、閉じるイベント群は1件ずつ append されるのでは
ありません。`amadeus-intent-completion.ts` が順序付き集合全体 — グラントが開いて
いれば `INTENT_GRANT_COMPLETED`、続いて `WORKFLOW_STATE_CLEARED`、
`WORKFLOW_COMPLETED` — を、期待イベント identity・期待 state projection revision・
terminal projection とともに terminal commit plan として構築します。

**completion seal** は、トランザクション id・完了エビデンスとその digest・
terminal projection・result にわたる digest です。受理は厳格で、receipt は同一の
トランザクション id、期待 projection revision、そして期待どおりの順序でまったく
期待どおりのイベント identity を持たねばなりません。部分的または順序の異なる
receipt は完了ではなく `CONFLICT` です。これにより「この Intent は閉じた」は状態
フラグではなく検査可能な主張になります。レビュー面は最後の
`INTENT_COMPLETION_TRANSACTION_COMMITTED` イベントから seal を読み、完了 Intent の
decision 群を固定された履歴に対してレビュー済みとして印付けます。

live なマルチハーネス検証も同じモジュールにありますが、それは **任意のエビデンス**
です。定数 `CORE_INTENT_COMPLETION_REQUIRES_LIVE_RECEIPTS` は `false` であり、本番の
workflow 完了経路は live 経路を import せず、receipt cohort を待ちもしません。
cohort と revision は後述の registry digest を pin するため、ある registry に対して
発行された cohort を別の registry に対して replay することはできません。

## harness registry

`amadeus-harness-registry.ts` は、ハーネスと各ハーネスの能力の正準テーブルです。
Core のファイルであり、全ハーネス配布へ byte-for-byte で投影されるため、各面が
コピーを個別保守するのではなく同一の事実に同意します。

各 descriptor は id と表示名、2つの面フラグ — `packageFace`(パッケージャが投影
するか)と `selfInstallFace`(プロジェクトルートへ反映しうるか)— および2つの
autonomy フラグ — `autonomyContract`(autonomy 契約を尊重するか)と
`autonomyLive`(live 検証を実行できるか)— を持ちます。`native` ブロックは、
live 認可の供給方式(`credential-attested` または `unavailable`)、judge replay が
`invoke-once` か利用不能か、live コマンドを運ぶ環境変数(無い場合は `null`)を
記録します。

`PACKAGE_HARNESS_IDS` と `SELF_INSTALL_HARNESS_IDS` はこれらのフラグでテーブルを
フィルタして導出され、対応する TypeScript の union 型も同じリテラル行から導出され
ます。ハーネスの追加は1行の追加です。id の union・導出される id リスト・全消費側の
型検査がそこから従い、歩調を合わせるべき第2のリストは存在しません。
