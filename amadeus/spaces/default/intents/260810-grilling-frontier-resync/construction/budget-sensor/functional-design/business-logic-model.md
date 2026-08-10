# Business Logic Model — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-4 の3態)、`component-methods.md`(関数シグネチャの基底 — 本書が判定フローへ展開)、`components.md`(C3 の単一ファイル所有)、`services.md`(advisory 契約 — exit 0 固定・audit 行 verdict)、`unit-of-work.md`(U2 完了条件)、`unit-of-work-story-map.md`(スライス2)。



> **【申告付き改訂 2026-08-10】BR-U2-2b の検出方式をマーカー方式へ変更**(出典: ソロ選挙 **E-GFR-CG2** choice B「言語中立マーカーへ統一して U1 へ追補」2-0 established / GoA 2x2、記録 `amadeus/spaces/default/elections/260810-e-gfr-cg2/` + **ユーザー承認 2026-08-10**、エスカレーション正準リスト(4)該当としてユーザー裁定を経ている)。本書の以下の記述のうち、刈りノード列挙節の**機械照合対象**を「見出し逐語 `閾値未満として明示的に先送りした点` の完全一致」とする部分は**失効**し、正しくは **言語中立マーカー `<!-- amadeus-grilling:deferred -->` の存在のみ**を照合する。理由: Amadeus はフレームワークとして他プロジェクトへ配布され、「`amadeus/**/*.md` は日本語」は本プロジェクト固有のユーザー指示であってフレームワーク契約ではないため、出荷センサーが日本語逐語見出しを機械照合すると他言語利用者の環境で構造的に恒久 FAIL する(既存2トークンも言語中立 HTML コメント)。人間可視の見出し文言は言語規約に従い自由。走査範囲(questions ファイル本文全域)・判定は存在のみ・型 `{ present: boolean }` は不変。実装は `packages/framework/core/tools/amadeus-sensor-question-budget.ts` の `detectDeferredSection`、正本トークン定義は C1(`grilling-protocol.md` §2.3)単一定義で本 Unit は verbatim 参照。**刈り0件でもマーカー+節は必須**(FR-PROTO-7「空の明示は必要」)。BR-U2-4 の vacuity guard の根拠のうち「見出し形のため `LINE_PATTERNS` との交差可能性」の記述も、照合対象が HTML コメントへ変わったため実装とは対応しない(guard 自体は正本3トークンで実施済み)。(cid:code-generation:cg-invariant-conflict-explicit-revision / cid:requirements-analysis:implementation-deviation-election)

## 判定フロー(evaluateQuestionBudget の改訂形)

**構成上の要点(BR-U2-8 の実装形)**: finding は分岐の途中で emit せず、いったん**候補**として積み、`enforced` ゲートを**単一の適用点**で通してから verdict にする。現行実装は `enforced` を over-budget 直前でしか見ないため(`amadeus-sensor-question-budget.ts:316` の `if (!enforced) return verdict("pre-cutoff", …)`)、新 finding を分岐途中で返すと cutoff を迂回する経路ができる — 候補積み上げ方式はその迂回路を構造的に消す。

```text
入力: questions ファイル本文 body、depth(state 由来 | null)、outputPath
Phase 0 — 構造前置(現行不変・改訂で触れない)
  拡張子不一致 → not-questions-file / 読取不能 → no-file / 空 → empty
  いずれも findings=[] ・figures=NONE で即 return(:283-295)

Phase 1 — 計測(現行不変、ただし enforced を全分岐より前に確定)
  questions  = countQuestions(body)                       (:297)
  recordDate = recordDateOf(resolveRecordRoot(outputPath)) (:298)
  enforced   = underQuestionBudgetEnforcement(recordDate)  (:299)
  level      = canonicalDepth(depth)                       (:300)
  ceiling    = level なら QUESTION_BUDGETS[level]           (:301)

Phase 2 — 分類(finding は出さない。判別値を決めるだけ)
  marker    = detectGrillingMarker(body 先頭10行) → none | valid | malformed
  deferred  = detectDeferredSection(body 全域)     → { present: boolean }
  justif    = parseJustificationLine(body 全域)    → { depth, questions } | null
  depthKind = depth が null/空       → absent
              level が解決した       → known
              それ以外(3値外の実値) → unknown

Phase 3 — 候補 reason と候補 findings の決定(下の決定表)

Phase 4 — enforced 単一ゲート
  findings = enforced ? 候補findings : []
  reason   = enforced ? 候補reason   : 縮退reason(下表の右端列)

Phase 5 — verdict(reason, findings, figures)
```

### 決定表(Phase 3 / Phase 4)

`marker=malformed` は下表のどの行でも `malformed-marker`(warning)を候補へ**加算**する(reason は変えない)。

| marker | depthKind | count vs ceiling | 記録行 | deferred 節 | 候補 reason | 候補 findings | 縮退 reason(`!enforced`) |
|---|---|---|---|---|---|---|---|
| any | absent | — | — | — | `no-depth` | — | `no-depth` |
| any | unknown | — | — | — | `unknown-depth` | `unknown-depth`(warning) | `no-depth` |
| none / malformed | known | ≤ | — | — | `within-budget` | — | `within-budget` |
| none / malformed | known | > | — | — | `over-budget` | `over-budget`(error) | `pre-cutoff` |
| valid | known | ≤ | — | — | `within-budget` | — | `within-budget` |
| valid | known | > | あり | あり | `justified-overrun` | — | `pre-cutoff` |
| valid | known | > | 欠 | あり | `over-budget-unjustified` | `missing-justification`(error) | `pre-cutoff` |
| valid | known | > | あり | 欠 | `over-budget-unjustified` | `missing-deferred-list`(error) | `pre-cutoff` |
| valid | known | > | 欠 | 欠 | `over-budget-unjustified` | `missing-justification` + `missing-deferred-list`(いずれも error) | `pre-cutoff` |

縮退列が現行語彙(`no-depth` / `within-budget` / `pre-cutoff`)のみで構成されることが、不変条件「pre-cutoff record の判定結果は改訂前後で同一」の**構成的な**担保である — 新語彙は enforced 側にしか現れない。

### 刈りノード列挙節の検出仕様(`detectDeferredSection`)

BLOCKER 是正としてここで確定する。正本は U1 の **BR-U1-4** および FR-PROTO-7。

- **見出し逐語**: `閾値未満として明示的に先送りした点`(BR-U1-4 / FR-PROTO-7 からの逐語。U2 側で言い換えない)
- **走査範囲**: questions ファイル**本文全域**。マーカー検知の先頭10行窓とは別 — 合意サマリはファイル末尾に置かれるため、頭窓では構造的に検出不能
- **述語**: 行頭の `#{1,6}` + 空白 + 前後の装飾(`**`)と空白を除去した見出しテキストが上記文字列と**完全一致**。**見出しレベルは非依存**とする — BR-U1-4 は「節」とだけ規定しレベルを定めていないため、U2 がレベルを固定すると U1 の承認済み契約へ存在しない制約を足すことになる(`cid:requirements-analysis:c2c5-structural-addition-not-execution`)
- **判定の粒度**: 節の**存在のみ**を見る。項目本文は検査しない — FR-PROTO-7 が「空の明示は必要」とする以上、Free の空明示と刈り0件は同一に扱わねばならず、項目数を見る述語はこれを区別してしまう
- **配置の根拠**: この節が questions ファイル内にあることは C3 の既承認境界(`components.md:31` — 「C3 → questions ファイル書き手(conductor): …超過記録行・刈りノード列挙節の様式」)。センサーは当該 questions ファイル1点しか読まないため、走査範囲はそのファイルに閉じる

テキストフォールバック: マーカーが grilling を宣言した questions ファイルだけが「記録付き超過」を許され、記録か列挙が欠ければ従来より厳しく FAIL する。マーカーが無いファイルの挙動は、depth が既知または未指定なら現行と同一 — ただし depth が3値外の実値のとき(`depthKind = unknown`)だけはマーカーの有無に関わらず warning が立つ(FR-CONTRACT-4(ii) の fail-open 封鎖は marker と独立の要求のため)。cutoff 前の record はマーカー・depth 値のいずれにも関わらず現行と完全同一。

## エラー分類(error-classification 適用)

| 状態 | 分類 | severity | 扱い |
|---|---|---|---|
| 異形マーカー | fault(書き手の様式誤り) | `warning` | loud finding・`pass` 維持(advisory) |
| 未知 depth | fault(上流 state の異常値) | `warning` | loud finding・`pass` 維持(fail-open の封鎖) |
| 超過+記録なし | error(契約違反) | `error` | FAIL finding |
| 超過+列挙節なし | error(契約違反) | `error` | FAIL finding |
| 超過(通常モード) | error(契約違反) | `error` | FAIL finding(現行不変) |
| ファイル読取不能 | 既存経路のまま(変更しない) | — | 既存(finding を出さない) |

### `pass` の計算式(FOLLOW-UP 是正)

現行の `verdict()` は `pass: findings.length === 0`(`amadeus-sensor-question-budget.ts:274`)。この式のままでは warning finding が `pass` を false へ倒すため、「warning は pass 維持」という上表と両立しない。**`QuestionBudgetFinding` へ `severity: "error" | "warning"` を加え、`pass = findings.every(f => f.severity === "warning")` とする**(= error finding が1件も無いこと)。

- `findings_count` の意味は不変(finding 総数 — warning も数える)。読み手にとって「何件観測したか」であって「何件落ちたか」ではない。
- 既存 `over-budget` finding には `severity: "error"` を明示付与する。**保存されるのは挙動(超過で `pass:false`)であって出力バイト列ではない** — `main()` は結果全体を `JSON.stringify` して stdout へ書く(`amadeus-sensor-question-budget.ts:367-369`)ため、必須キー追加は stdout JSON の形を変える。この差は**意図した契約変更**であり、`severity` は finding の消費者(ゲート報告・audit 読み)から見える。stdout 形の後方互換を要求する消費者は現時点で存在しない(センサー出力の消費者はディスパッチャのみ)。
- `severity` を optional にして省略時 `"error"` と読む形は採らない。省略可能なフィールドは判別を型で運ばず、`parse-don't-validate` に反する(construction.md)。既存 finding は1箇所なので明示付与のコストは無い。

## 不変条件

- **回帰不変(マーカー非検知・既知/未指定 depth)**: マーカー非検知 **かつ `depthKind ≠ unknown`** のファイルは、verdict の全フィールド(`pass` / `reason` / `findings` / figures)が改訂前後で同一。`depthKind = unknown` を除外するのは、FR-CONTRACT-4(ii)(`requirements.md:35`)が marker とは独立に「未知 depth の無音通過を loud warning へ封鎖」を要求しており(決定表 row 2 が `marker=any` キーなのはこの要求の反映)、marker 非検知の全域で挙動不変を主張すると当該 FR と両立しないため。この除外は**設計上の意図**であって取りこぼしではない。
- **回帰不変(cutoff 前)**: `enforced === false` の record は、マーカー・depth 値・記録行・列挙節の状態にかかわらず verdict が改訂前後で同一。Phase 4 の単一ゲートが `findings=[]` と現行語彙の縮退 reason を強制することで構成的に保証する — 「どの分岐も cutoff を迂回しない」ことがテスト可能な形になる。`depthKind = unknown` の除外が不要なのは、cutoff 前では候補 finding が捨てられ reason も `no-depth` へ縮退するため(決定表 row 2 の縮退列)。
- 全経路で exit 0(advisory 契約)・verdict は finding JSON と audit 行のみ。
- 記録行の parse は verification-numeric-parse 準拠(`questions=` は数値 parse、失敗は記録行不成立 = `null` として扱う)。`detectDeferredSection` は真偽のみを返し parse を持たない(存在検査のため)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T06:55:21Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY(GoA 7): FR→BR 写像・マーカー2種の cross-unit verbatim 一致・語彙非交差(ANSWER_TAG_RE 実読)は健全。BLOCKER 2件 — (1) 刈りノード列挙節の検出仕様(見出し verbatim・走査範囲・型/parse 契約)が U1 の BR-U1-4 から未引用で未定義、vacuity guard の対象からも欠落 (2) cutoff/enforced の適用順序が判定フロー Step 2 の早期終了と BR-U2-8(unknown-depth へも cutoff 同一適用)で自己矛盾し、pre-cutoff record の回帰不変条件を破りうる。FOLLOW-UP 2件(pass 計算式の既習パターン依拠の明文化 / GrillingMarker の判別ユニオン化)

### Findings

- BLOCKER | 刈りノード列挙節の検出仕様が未定義 — U1 BR-U1-4 の見出し verbatim を U2 3成果物が未引用(grep 0 hit)、型・parse 契約が domain-entities に不在、走査範囲未指定、vacuity guard 対象外
- BLOCKER | cutoff(enforced)の適用順序が自己矛盾 — 判定フロー Step 2 の unknown-depth 早期終了が Step 6 の enforced を経由せず、BR-U2-8(cutoff 同一適用)と衝突。pre-cutoff record の回帰不変(改訂前後 byte 同一)を破りうる。malformed-marker の enforced 合流も未記述
- FOLLOW-UP | warning finding と既存 verdict() ヘルパー(pass = findings.length === 0)の整合 — reason 区別・findings 空の既習パターン依拠を明文化
- FOLLOW-UP | GrillingMarker を判別ユニオン({kind:none|valid|malformed})へ — 無効状態の構造的排除(parse-don't-validate)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T07:36:15Z
- **Iteration:** 2
- **Scope decision:** none

NOT-READY(GoA 5): i1 の BLOCKER 2件は閉包確認(検出仕様は逐語=requirements.md:25 完全一致・走査範囲・述語・型・vacuity guard 対象が揃い実装可能、単一ゲートと縮退列は決定表9行すべてで現行語彙のみ・全次元で total かつ非重複)。ただし新規 BLOCKER 2件 — 回帰不変(マーカー非検知)が BR-U2-3/決定表 row2 と severity キー追加により偽、U2 完了条件『遮断器発火の落ちる実証(FR-PROTO-8 AC)』が無 BR で 1:1 主張も偽。センサー実装への file:line 引用は check-read 不可のため未検証(限界として開示)

### Findings

- BLOCKER | 回帰不変『マーカー非検知ファイルの verdict は改訂前後で同一(全フィールド)』(business-logic-model.md:92、:69 の同旨、domain-entities.md:30 の回帰テスト計画)が自己矛盾 — 決定表 row2(:48)は marker=any キーで、BR-U2-3(business-rules.md:12)が要求する marker 非検知×depthKind=unknown の変更(no-depth/[] → unknown-depth/[unknown-depth warning]、FR-CONTRACT-4(ii) 由来 requirements.md:35)と両立不能。加えて :87 の『既存 over-budget finding は byte 同一で保存』も、findings が JSON で出力される前提(business-logic-model.md:94 / component-methods.md:17)では severity 必須フィールド追加により出力面で不成立。是正 = 不変条件を『マーカー非検知 かつ depthKind ≠ unknown』へ限定し、severity が出力面へ露出するか否かを明示する(cutoff 前の不変条件は findings=[] のため影響なし)
- BLOCKER | U2 完了条件『遮断器発火の落ちる実証(FR-PROTO-8 AC)』(unit-of-work.md:22、正本 requirements.md:26 = 発火ケースを注入して赤を実測)に対応する BR が不在 — BR-U2-7(business-rules.md:16)は trace タグに FR-PROTO-8 を掲げるが本文5態(i)-(v)に遮断器発火が無く装飾タグ、BR-U2-6(:15)は t415 の prose pin のみ。component-methods.md:18 が『C3 は遮断器を消費しない』と明記するため注入面・観測面がどこにも設計されておらず、business-rules.md:21 の『U2 完了条件全数と1:1』は偽。是正 = 遮断器発火の注入面と観測面を BR として設計するか、当該 AC の所有 Unit を申告付きで再確定する
- FOLLOW-UP | detectDeferredSection の述語が U1 テンプレの実レンダリング形へ未接地 — 逐語文字列自体は requirements.md:25 と完全一致を確認したが、述語は行頭 ATX 見出し(#{1,6}+空白)を構造的前提とし、U1 が同節を太字行や接尾辞付き見出しでレンダリングする場合に error severity の偽 FAIL(missing-deferred-list)になる。BR-U1-4 と U1 テンプレは本レビューのスコープ外で未検証。是正 = BR-U2-7(i) の fixture を U2 自作でなく U1 テンプレ由来とし、write⇔check 対の実接地を BR へ明記
- FOLLOW-UP | BR-U2-4(business-rules.md:13)の『2方向 assert』は第2方向が未列挙 — 記載の2 assert(answer-evidence 述語不変・countQuestions 不変)はいずれも『正本トークンを注入して既存述語が不変』の同一方向。逆方向(通常の questions コーパスに対し新述語3種 = マーカー/記録行/列挙節が誤発火せず 0 hit)を明記すべき。マーカー誤検知は数値検査を justification 検査へ切り替えるため fail-open 側の影響を持つ
- NIT | business-logic-model.md Phase 2 のヘルパー名(detectDeferredSection / parseJustificationLine)が component-methods.md:13-14 の宣言シンボルと対応付けられておらず、checkGrillingJustification の帰趨(3関数へ分解したのか内部に残るのか)が本文で未記述
- NIT | unit-of-work-story-map.md は3成果物とも上流入力ヘッダの注記のみで本文未参照 — 装飾トークン化のリスク(artifact-upstream-inputs-header)
