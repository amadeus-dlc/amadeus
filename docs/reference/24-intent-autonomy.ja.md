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

| モード | 人間なしで裁定できる範囲 |
| --- | --- |
| `none` | なし。すべてのゲートと質問が `human-required` です。 |
| `semi` | 内部ステージゲートのみ。phase boundary でないステージゲートに限り、かつモード自体が人間コマンドで設定されている場合だけです。 |
| `full` | 現在のグラントの scope が許す範囲。 |

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

```
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

effect は分類されており、5つの分類はグラントでは決して認可できません。
`new-permission`・`irreversible`・`scope-out`・`norm-waiver`・`quality-waiver` です。
payload が記録済み fingerprint と一致しない effect や、適用 norm fingerprint が
動いた effect は `PAYLOAD_MISMATCH` / `NORM_DRIFT` として拒否されます。したがって
autonomy は、モードにかかわらず自身の権限を広げること・品質を waive すること・
不可逆な操作を行うことができません。

## 質問を裁定する

`semi` / `full` でのゲート裁定は直接的です。根拠はモード provenance または
グラント自身であり、decider は決定的エンジンです。

`full` での *質問* は順序付き解決を通ります。この順序自体が要点で、より安価で
より権威ある根拠から順に参照されます。

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
