# Decisions (ADR) — インセプション固定費バッチ(#3181 + #2415)

上流入力: `inception/requirements-analysis/requirements.md`(FR-EVD / FR-EXC / FR-MEAS)、RE scan record(`codekb/amadeus/re-scans/260817-inception-cost-batch.md` §3 の機構実測)、codekb `architecture.md` / `component-inventory.md`(現行構成)。裁定 provenance は `application-design-questions.md` の AUTO_DECIDED ×3。

## ADR-1: issue-evidence の取り込みは独立 read-only CLI verb + gateway 第3 adapter で行う

- **Context**: #3181 は取り込み実装形を設計裁定事項として3案(artifact 化 / consumes 拡張 / CLI fetch)を挙げる。機構制約(scan record §3): consume-only artifact は graph compile の hard error、RE の produces は codekb arm で共有 codekb へ解決(per-intent 証跡の置き場に不適)、github-gateway には mirror / finding の2 adapter 前例と read 面(`viewArgv` / `parseIssueObject` / `readiness`)が実在。
- **Decision**(梯子 `auto-decision-190a2c10161bd6ad7355301a66a865da`): `amadeus-utility.ts` に read-only verb `issue-evidence fetch` を新設し、`amadeus-github-gateway.ts` の第3 read-only adapter(evidence adapter — Issue 本文 + コメント読取)で取得する。取得結果は record の `<record>/ideation/intent-capture/issue-evidence.md` へ書き、artifact kind `issue-evidence` は **intent-capture の `optional_produces`** として宣言(off-path producer は advisory — intent-capture SKIP の self-fix でも graph 不変量が壊れない)。RA / RE の `consumes:` へ `required: false` で追加する。
- **`optional_produces` の実在と FR-EVD-2 AC 充足の根拠**(本設計断面 = HEAD 23d4ae767 で実測): スキーマは `packages/framework/core/tools/amadeus-stage-schema.ts:37` に `optional_produces?: string[]` を宣言し `:428-430` で検証。graph の producer 解決は `packages/framework/core/tools/amadeus-graph.ts:860` が `(s.optional_produces ?? []).includes(artifact)` で **optional_produces を producersOf に含める** — したがって FR-EVD-2 の AC(`amadeus-graph.ts artifacts` に producer 付きで列挙・orphan hard error 非該当)は optional_produces 宣言で機械的に満たされる。既存実例: `functional-design.md` / `infrastructure-design.md` の frontmatter。FR-EVD-2 本文の「`produces:` に載る」は produces 族(produces / optional_produces)の宣言として充足し、**素の `produces` を採らない理由**: produces は全スコープで必須出力になるため、issue-first でない intent(非 Issue 起点の self-feature 等)で構造的に生成不能な必須成果物を作ってしまう。スキーマ変更は不要(新規コンポーネントなし)。
- **Consequences**: (+) birth トランザクションと非結合で gh 失敗が波及しない(fail-open が構造で成立)。(+) verb 単体で TDD・落ちる実証が可能。(+) mutation permit 不要(read-only)。(−) conductor がインセプション冒頭に verb を1回実行する手順が契約に増える。(−) intent-capture SKIP 時は「stage が書かない場所へツールが書く」形になる — 契約に明記して驚きを消す。
- **Alternatives Rejected**(ラベルは `application-design-questions.md` Q1 の選択肢 A/B/C に対応 — **B が採用案**のため却下側は A と C): (A) intent-birth 統合 — mirror の冪等・retry 機構へ gh 依存を持ち込み、birth の失敗様式を増やす。取得失敗と intent 誕生失敗の分離が壊れる。(C) 契約 prose のみ — #3181 完了条件1「取り込み成果物の実在」を人手作業に残し、固定費削減の機械的保証がない。
- **C3(専用 path resolver)の必要性**: 汎用 `resolveArtifactPath` / `resolveConsumePath` は `amadeus-orchestrate.ts` 内部の graph-compile 済みコンテキスト(owner stage 解決済み)でのみ動く engine 内部関数であり、CLI verb(C2)は orchestrate ループの外で単独実行される。engine 外の決定的パス解決には `codekb-path`(`codekbDir`/`codekbReScanFile` — 純関数 path builder)の既存前例があり、C3 はその流儀の踏襲。重複ではなく実行コンテキストの分離(値の一致は C7 の drift 検査で pin)。
- **Reversibility**: 高。verb と adapter は追加面であり、廃止時は consumes の optional 記述と契約 prose を戻すだけ(データ移行なし)。

## ADR-2: RE 差分入力の除外は「排出物クラス宣言」で定義する

- **Context**: #2415 の第一候補は `amadeus/spaces/*/intents/` 単独。しかしクロスレビュー両名が同根排出物(elections / codekb / metrics)への対称拡張を勧告し(reviewer-2 実測: intents 単独では直近区間の排出物 84.04% 中 29.68pt が除外外に残る)、本 intent の RE 区間でも排出物 61.8% 中 intents は 39.1%pt に留まる。さらに `amadeus/spaces/*/specs/**`(model-map.json / tla-evidence)は spaces 配下だが build 台帳であり、blanket 除外は bt-ledger-resync クラスの誤除外を作る(scan record §1 の実測)。
- **Decision**(梯子 `auto-decision-30c7a89ac4fcf8afae46df9188334fed`): 除外は個別パスの列挙ではなく**除外クラスの宣言**として `reverse-engineering.md` の Step 2(走査対象定義、現行 :104-112)へ置く: 除外 = `amadeus/spaces/*/intents/`・`amadeus/spaces/*/elections/`・`amadeus/spaces/*/codekb/`・`amadeus/spaces/*/memory/`・`metrics/`。**除外対象外の明示** = `amadeus/spaces/*/specs/`(build 台帳)。正準 pathspec は `:(glob)` マジック形で契約に逐語記載する(FR-EXC-5 — 素の `*/intents/` は 0 件無音マッチ)。
- **Consequences**: (+) 排出物の全クラスを対称に覆い、削減幅が実測 46.5〜86.5% レンジの上側へ届く。(+) specs/** の非除外を規定に含めることで誤除外の再発を封鎖。(−) codekb 自身を入力から除外するため、差分リフレッシュの base 妥当性は re-scans 台帳(除外対象外ではないが、base 解決は diff の外の read — 契約の base 解決手順 :157-181 は不変)に依存し続ける。この分離(base 解決は re-scans 読取、diff 入力は除外適用後)を契約に明記する。
- **Alternatives Rejected**: intents 単独 — 実測で排出物の半分弱しか覆わず、elections(直近区間 20.2% の実測点あり)が次の増殖源として残る。パーセンテージ固定の閾値化 — requirements の梯子裁定 Q2=A(数値下限なし・帰属検査)で既決。
- **Reversibility**: 高。契約 prose の変更のみ。クラスの追加・削除は同じ節の編集で閉じる。

## ADR-3: codekb の工程記録引用は「許容して失う」— 正規流入経路は issue-evidence へ一本化

- **Context**: FR-EXC-3。「工程記録は codekb に一切寄与しない」には反例2件(xrev-2415 r1 が全数 grep で実測した具体2箇所: (1) codekb `architecture.md:3450` が他 intent の `intents/260724-mirror-auto-modes/construction/mirror-github-gateway/nfr-design/security-design.md:37` を **verbatim 引用**、(2) 同 `architecture.md:5513` が他 intent の `construction/` を `ls` 列挙して unit 数を確定 — 行番号は r1 の測定断面 23d4ae767)。除外導入後この用法をどうするかは無申告の退行にできない。
- **Decision**(梯子 `auto-decision-1ff6f6c50e3c7df015ec3414e91cd6a7`): 許容して失う。除外導入後、codekb 本体成果物は工程記録を**新規引用しない**構造とし、その旨を `reverse-engineering.md` へ明文化する。既存引用2件は履歴として残存(遡及削除しない)。自 intent の事実の正規流入経路は #3181 の issue-evidence(ADR-1)が担う — 両 Issue の設計接合点。
- **Consequences**: (+) 除外述語に例外分岐がなく、FR-EXC-4 の帰属検査(未帰属除外ゼロ)が単純な集合演算で書ける。(+) 設計 provenance は Issue 側(クロスレビュー済み一次資料)へ寄り、監査可能性が上がる。(−) Issue を経由しない intent 内設計事実は codekb へ verbatim 引用できなくなる — 必要なら要約(引用でなく再記述)で載せる。
- **Alternatives Rejected**(2案):
  1. **自 intent record 読取例外** — 除外規定へ条件分岐を持ち込み(P5 surgical 違反)、帰属検査の述語を複雑化する。例外の適用判断が毎スキャンの人手判断として残る。
  2. **codekb を除外クラスから外して引用用法を温存** — 引用の温存だけが目的なら除外集合の縮小で足りるが、codekb 自身は本 intent 区間で 936 ins / 11.7%(直近区間実測 1.6〜17.6%)の自己増幅成分であり、除外しなければ #2415 の目的(排出物比の恒常的削減)が partial になる。引用2件の便益より増殖遮断を優先し却下(ADR-2 のクラス宣言と整合)。
- **Reversibility**: 中。将来、要約では足りない実例が出た場合は例外を追加する余地が残る(その時は本 ADR を改定)。

## functional-design 要否の判定材料(ゲート時の jump 判断へ)

issue-evidence のデータ形状は本設計で確定した(`component-methods.md` § issue-evidence artifact 様式): 単一ファイル・per-issue 節・構造化メタデータ(FR-EVD-6 の全項目)+ 本文/コメント verbatim。business-logic はなく、残る実装判断は関数分割と Result 型の詳細のみ — functional-design の追加成果物は stage 契約 markdown と本 decisions の重複記述になる。**推奨: FD は jump**(判断はゲート時の梯子/engine 手順に従う)。
