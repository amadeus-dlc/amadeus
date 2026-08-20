# 新規プロトコルへ形式モデルを供給する

`amadeus/spaces/<space>/specs/tla/model-map.json` が、実在する `.tla` と `.cfg` を持つ model を宣言するまで、
有効化判定は `not-ready` となり、明示検査は不足理由付きで失敗します。model が0件でも
plugin の導入自体は有効であり、自動 lifecycle 経路が TLC を起動することはありません。

> 言語: [English](22-formal-model-supply.md) | **日本語**

Amadeus は二層で検証します。property-based・unit・integration のテストは全変更で走り、日常の負荷を担います。単一の完全探索形式モデルは要求時にのみ走り、対象は並行プロトコル — 選挙・監査ロック・provenance・mirror ライフサイクル — に限られます。そこでは、興味深い失敗が「例示ベースのテストでは思いつかない順序」として現れるからです。

第二層が存在するのは、第一層に構造的な盲点があるためです。property-based テストが検査したい不変量を自身のオラクル内で再実装すると、実装の欠陥がオラクル側の同じ欠陥で相殺され、テストは green のままになります。本リポジトリ自身の適格性実験での実測では、この相殺が7件中4件の埋め込み欠陥を隠しました。完全探索モデルは7件すべてを検出しました。

本章はその第二層へモデルを追加する工程です。変更されたコードへ既存モデルを追従させる工程は [形式モデルを実装に追従させる](21-formal-model-following.ja.md) を参照してください。

## どのプロトコルが対象になるか

**並行または再開しうるアクターが共有する状態**を持ち、かつ違反が無音になる安全性を持つプロトコルにモデルを追加します。mirror ライフサイクルが該当するのは、境界間のクラッシュが receipt を取り残しうるうえ、誤った復旧が第2の GitHub Issue を開き、それを報告する仕組みが他にないからです。

純粋関数・単一スレッドの変換・自前オラクルを再実装せずに property-based テストで覆える対象へは追加しません。形式層は「いずれ全てが到達すべき品質段階」ではなく、特定の失敗クラスのための道具です。適用範囲を広げるほど、安価な層が既に証明していることの証明へ完全探索時間を費やすことになります。

## 1. 題材と invariant を選ぶ

実際に起きた欠陥から始めます。実 Issue から導出した invariant は証人を名指しできますが、設計から発明した invariant は、コードが既に自明に満たしている内容の言い換えになりがちです。

各 invariant は出典 — Issue 番号・FR・police する述語の `file:line` — をコメントとして module に焼き込んで書きます。半年後、その invariant がまだ本質的なのか化石なのかを読者に伝えるのは出典です。

invariant は、実装が実際に保証している条件の上で述べます。コードがある性質を操作の**enable 時点**で強制しているなら、現在状態の上に書いた invariant は、実装が決して行わない順序について違反を報告します。代わりに enable 条件を witness として状態に記録し、その witness の上で表明してください。

## 2. 有限ドメインへ縮約し、全縮約を申告する

TLC は網羅的に探索するため、ドメインは有限かつ小さくなければなりません。各縮約は「捨象した詳細が invariant に影響しえない」という主張であり、申告されない縮約は見落としと区別できません。

module 冒頭に縮約申告を置きます。縮約ごとに、何を落としたかと、invariant が同じ抽象空間に及び続ける論拠を述べます。「この transition は無関係に見える」ではなく「この transition は、モデル化済みの transition が到達しない抽象状態へ到達しない」の形の論拠を優先します。

申告を誠実に保つ規則が2つあります。

- **記憶ではなく機械で列挙する。** dispatch への grep で全 transition 集合を導出してから差し引きます。手で思い出した一覧は、先月誰かが追加した分岐を落とします。
- **除外を1件ずつ検証する。** 除外7件を1文で覆う説明は、少なくとも1件については誤りになります。各件をコードに突き合わせ、論拠が異なるものには固有の論拠を与えてください。

過大近似は安全側です。ガードを落とすと実装なら拒否する振る舞いを許容するため、証明済みの invariant は証明済みのままです。危険なのは **transition** を落とす方向で、到達可能状態が消えます。

## 3. ガードを忠実に翻訳する

各演算子は実装の名前付き述語に対応させ、`file:line` をコメントに置きます。自分が整っていると感じる形へ言い換えたくなるのを抑えてください。モデルの価値は、レビュアーが両者を並べて突き合わせられる点にあります。

行番号はずれます。機械が検査する束縛は `model-map.json` の SHA pin です。両方を書いてください — 人の目のための行番号と、sensor のための pin です。

## 4. モデルを登録する

モデル・その `.cfg`・正準実装ファイルを `amadeus/spaces/<space>/specs/tla/model-map.json` へ追加します。`entries` には、モデルが述語を翻訳した**全**ファイルを載せます。明白な1ファイルだけでは足りません。`entries` から漏れたファイルの述語は、sensor に気づかれずに変わりえます。

同一変更で `model-completeness` sensor の `matches` glob を新しい実装パスへ拡張します。map と glob は1つの監視面の両半分であり、半分だけの面は fail-open します。

## 完走こそがエビデンス

実行がエビデンスになるのは、TLC が宣言済み有限ドメインの固定点へ到達し、それを報告した場合だけです。completion marker を state 統計 — 生成状態数・distinct 状態数・探索深さ・キュー残り 0 — とともに記録します。

部分探索・timeout・統計欠損の実行は harness エラーであって結果ではありません。「違反は見つからなかった」として報告してはなりません。モデルは状態空間のある接頭辞だけを検査して停止したのであり、それはまさに未検出の違反が最も起こりやすい状況です。

## 5. モデルが落ちることを実証する

一度も何も棄却したことのないモデルは、invariant が空文化しているモデルと区別できません。新しいモデルをエビデンスとして扱う前に、異なる2通りの方法で落としてください。

**落ちる実証。** 実在の欠陥を再現する変種を作り、該当 invariant が反例トレースを出すことを確認します。欠陥が歴史的 — 本線では修正済み — の場合、変種は欠陥側の意味論へ向けたまま保ち、修正後コードへ向け直さないでください。向け直すと2つの変種が同一になり、エビデンスが失われます。

落ちる変種は恒常ジョブから外します。恒久的に赤いスケジュールジョブは、全員がそれを無視するよう訓練します。一度実行してトレースを記録し、`model-map.json` には通る変種だけを登録します。

**空文化ガード。** invariant が語る状態が、有限の上界の内側で実際に到達可能であることを確認します。安価な方法は反転 invariant です — 対象状態が到達不能だと表明し、TLC がそれを違反することを要求します。上界をわずかに小さく取りすぎると、invariant は自明に真となり、それに見合う green な実行結果が残ります。

## 6. 人間ゲートを通す

モデル・縮約申告・完走統計・反例トレース・空文化の結果は、1つのレビュー可能なパッケージです。第二の読者を最も必要とするのは縮約申告です。そこはモデルが、どの実行によっても明らかにならない形で誤りうる唯一の場所だからです。

## 検査を実行する

plugin を compose し、ホストがそのステージをワークフロースコープへ割り当てると、そのスコープは build-and-test 後に形式モデルのライフサイクルを実行します。まず `tla-authoring` が active requirements の適用可否を評価し、未登録の対象は `author-new`、登録済み対象の意味変更は `revise-model` へ送ります。終端経路または非対象なら TLC を省略し、モデルを新規作成・改訂した場合は続く `formal-model-check` がそのモデルを検査します。スコープ割当はホストの project 設定 `plugin.scope-bindings` が所有するため、利用者は plugin を変更せず、自分で定義したスコープへ割り当てられます。checker は従来どおり明示起動もできます。

```
bun .claude/tools/amadeus-orchestrate.ts next --stage formal-model-check --single
```

ステージは `run-model-check` CLI 経由で TLC を実行します。Java と `tla2tools.jar` は `formal-model-check` plugin の opt-in 依存であり、Bun-only のフレームワーク baseline には含まれません。いずれも pin されており、同じモデル・設定・image digest が同じ verdict を返します。実行面ごとの provisioning は [plugin README](../../plugins/formal-model-check/README.md) を参照してください。

## エビデンスを記録する: `tla-authoring` CLI

上記ステップ6はレビュー可能なパッケージを生みます。`tla-authoring` は、そのパッケージを書き留め、アドレス付けし、後から再検査するための CLI です。あわせて、統治下の要件がモデルを伴わずに動いたことをチェックポイントへ知らせます。

CLI は plugin に同梱され、`plugins/formal-model-check/tools/tla-authoring.ts` に置かれ、plugin の `tools` リストへ登録されています。役割はディスパッチのみで、判断はすべて下層の `tla-evidence.ts` と `tla-applicability.ts` にあります。契約は stdout へ JSON 1行、終了コードは成功 `0`・型付き失敗 `1`・usage エラー `2` です。引数なしで実行すると、エラー経路で完全な usage を表示します。

```
bun plugins/formal-model-check/tools/tla-authoring.ts
```

**identity(同一性)。** モデルはファイルではなく、形式化した要件テキストへ結び付きます。`identity extract` は文書を読み、閉じた文法に合致する id の節を digest します — `###` 見出し下の `FR-`・`NFR-`・`AC-` +3桁、`##` 見出し下の `ADR-` +数字です。節本文は hash 前に正準化(LF 改行・行末空白なし・前後の空行なし)されるため、散文の折り返しでは digest は動かず、ガードの変更では動きます。`identity compare` は記録済み digest に対して `current` か `stale` を報告します。

```
bun plugins/formal-model-check/tools/tla-authoring.ts identity extract \
  --doc amadeus/spaces/default/specs/tla/requirements.md --doc-kind requirements
```

**bundle(束)。** `bundle build` は content-addressed な envelope をエビデンスストアへ書き、`root` または先行 bundle digest である `--predecessor` へ連鎖させます。authoring bundle は applicability・trace・proof・review・approval の5レシートを、terminal-route レシートは applicability と approval だけを運びます。`bundle verify` は digest を再導出し記録済み subject identity を照合、`bundle read` はレシートを返し、`bundle list` / `bundle head` はストアと連鎖 head を列挙します。破損エントリは読み飛ばさず別枠で報告します。

```
bun plugins/formal-model-check/tools/tla-authoring.ts bundle list
{"ok":true,"refs":[],"corrupted":[]}
```

**applicability(適用可否)。** `applicability judge` は変更申告(`{ subjects, kind, rationale }`、`kind` は `new-subject` / `semantic-change` / `impl-only` / `non-target` のいずれか)を受け取り、登録済みモデルマップに対して経路を決めます。`applicability receipt` は同じ判断を行ってレシートを構築し、参照された人間承認を、それが名指す audit シャードに対して検証します。`--persist true` を付けると、そのレシートを `terminal-route-receipt` としてエビデンスストアへ書き込みます。終端経路の hold を解除できる根拠はこれだけです。終端でない経路、および承認が検証できない終端経路では永続化を拒否するため、hold を解除できないレシートがストアへ入ることはありません。終端経路で `--persist true` を省略した場合も CLI ゲートが拒否するため、印字だけのレシートでステージを完了できません。CLI は `--name value` の対しか読まないため、値は明示して書きます。終端経路は authoring 作業を伴わず `tla-authoring` ステージが拒否するので、レシートの発行はステージではなく本 CLI の責務です。`applicability series` は subject 集合の series key を導出します。

**hold(保留)。** `hold` は authoring を止めるべきかを評価します。ストアを列挙し、破損エントリが1件でもあれば解放を拒み、現在の identity と series で hold テーブルを走らせます。権威は stdout の型付き verdict であり、終了コードはそれを写すだけです。hold / no-hold を終了コードだけから読んではなりません。

## エビデンスストア

`plugins/formal-model-check/tools/tla-evidence.ts` は CLI ではなくライブラリです。自身のエントリポイントを持たず、`tla-authoring.ts` から利用されます。エビデンスストアへの唯一の書き手であり、ストアは `--store` フラグで移さない限り `amadeus/spaces/<space>/specs/tla-evidence` に置かれます。

ファイルは、判断側をファイルシステムなしでテストできるよう分割されています。純粋層が parse・正準化・digest・identity 比較・envelope 検証・head 解決を担い、ディスクにもクロックにもプロセスにも触れません。その下のハンドラ層がストア I/O を担い、純粋層へバイト列を渡します。書き込みは `.tmp` ディレクトリを経由して rename されるため、実行が落ちても、自分の digest だと称する名前で書きかけの bundle が残ることはありません。

ストアの出力を読むときに知っておく価値のある性質が2つあります。verified bundle を mint するのは `verify` だけなので、それを持っていること自体が「単に読んだ」ではなく「検査済み」の証明になります。もう1つ、走査は読めないエントリを破棄せず `corrupted` として理由(`digest-filename-mismatch` / `unparseable` / `schema-invalid`)付きで報告します。これが、破損したストアに対して hold 評価が解放を拒める根拠です。
