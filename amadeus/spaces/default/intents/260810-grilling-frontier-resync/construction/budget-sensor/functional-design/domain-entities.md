# Domain Entities — U2 budget-sensor

**Intent**: 260810-grilling-frontier-resync / **Stage**: functional-design / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `requirements.md`(FR-CONTRACT-4 の語彙)、`component-methods.md`(シグネチャ)、`components.md`(所有ファイル)、`services.md`(advisory 出力契約)、`unit-of-work.md`(U2 境界)、`unit-of-work-story-map.md`(利用者可視の finding 種)。



> **【申告付き改訂 2026-08-10】BR-U2-2b の検出方式をマーカー方式へ変更**(出典: ソロ選挙 **E-GFR-CG2** choice B「言語中立マーカーへ統一して U1 へ追補」2-0 established / GoA 2x2、記録 `amadeus/spaces/default/elections/260810-e-gfr-cg2/` + **ユーザー承認 2026-08-10**、エスカレーション正準リスト(4)該当としてユーザー裁定を経ている)。本書の以下の記述のうち、刈りノード列挙節の**機械照合対象**を「見出し逐語 `閾値未満として明示的に先送りした点` の完全一致」とする部分は**失効**し、正しくは **言語中立マーカー `<!-- amadeus-grilling:deferred -->` の存在のみ**を照合する。理由: Amadeus はフレームワークとして他プロジェクトへ配布され、「`amadeus/**/*.md` は日本語」は本プロジェクト固有のユーザー指示であってフレームワーク契約ではないため、出荷センサーが日本語逐語見出しを機械照合すると他言語利用者の環境で構造的に恒久 FAIL する(既存2トークンも言語中立 HTML コメント)。人間可視の見出し文言は言語規約に従い自由。走査範囲(questions ファイル本文全域)・判定は存在のみ・型 `{ present: boolean }` は不変。実装は `packages/framework/core/tools/amadeus-sensor-question-budget.ts` の `detectDeferredSection`、正本トークン定義は C1(`grilling-protocol.md` §2.3)単一定義で本 Unit は verbatim 参照。**刈り0件でもマーカー+節は必須**(FR-PROTO-7「空の明示は必要」)。BR-U2-4 の vacuity guard の根拠のうち「見出し形のため `LINE_PATTERNS` との交差可能性」の記述も、照合対象が HTML コメントへ変わったため実装とは対応しない(guard 自体は正本3トークンで実施済み)。(cid:code-generation:cg-invariant-conflict-explicit-revision / cid:requirements-analysis:implementation-deviation-election)

## 型・値(amadeus-sensor-question-budget.ts 内、既存様式に従う)

| 実体 | 形 | 備考 |
|---|---|---|
| `GrillingMarker` 判定結果 | `{ kind: "none" } \| { kind: "valid" } \| { kind: "malformed" }` | **判別ユニオン**(FOLLOW-UP 是正)。boolean 2値では `{grilling:true, malformed:true}` という無効状態が型として構成可能で、不成立を実行時の約束で守ることになる — `parse-don't-validate`(construction.md)に従い無効状態を表現不能にする |
| 超過記録行 parse 結果 | `{ depth: string; questions: number } \| null` | null = 記録行不成立。questions は数値 parse 必須(型不正は null) |
| 刈りノード列挙節 検出結果 | `{ present: boolean }` | 存在検査のみ。項目本文を持たないのは FR-PROTO-7 の「空の明示は必要」— Free の空明示と刈り0件を区別してはならないため(business-logic-model.md § 刈りノード列挙節の検出仕様) |
| `QuestionBudgetFinding` | `{ field: string; reason: string; severity: "error" \| "warning" }` | `severity` を新設(FOLLOW-UP 是正)。`pass = findings.every(f => f.severity === "warning")`。optional にせず必須 — 省略可能なら判別が型に載らない |
| finding reason 語彙(追加分) | `"malformed-marker" \| "unknown-depth" \| "missing-justification" \| "missing-deferred-list"` | 既存 `"over-budget" \| "within-budget" \| "no-depth" \| "pre-cutoff"` に加算。既存語彙の意味は不変 |
| 結果 reason 語彙(追加分) | `"unknown-depth" \| "justified-overrun" \| "over-budget-unjustified"` | `QuestionBudgetResult.reason` 側。`justified-overrun` は finding を伴わない(PASS の理由表示)ため finding 語彙には現れない |
| 正本トークン(C1 参照) | マーカー行・記録行・列挙節見出しの verbatim 文字列定数 | **C1(grilling-protocol.md)が正本** — センサー内の定数にはコメントで C1 参照を明記し、独自変形しない。列挙節見出しは `閾値未満として明示的に先送りした点`(BR-U1-4 逐語) |

### 走査窓(3つの正本トークンで異なる)

| トークン | 走査範囲 | 根拠 |
|---|---|---|
| grilling モードマーカー | 本文**先頭10行** | ファイル冒頭宣言(BR-U2-1) |
| 超過記録行 | 本文**全域** | 超過発生**時点**で追記されるため位置が固定できない(BR-U1-6) |
| 刈りノード列挙節見出し | 本文**全域** | 合意サマリは末尾に置かれる(BR-U1-4) |

## 検査面(C4 テスト)の実体

- t415 改訂分: 新契約 pin 群(正本文言)+復活禁止 pin 群。
- 新規センサーテスト(t530 帯): BR-U2-7 の5態+BR-U2-4 の vacuity guard+回帰2種。回帰の対象は (a) **マーカー非検知 かつ `depthKind ≠ unknown`** の判定不変 (b) cutoff 前 record の判定不変(BR-U2-9 の全組合せ)。(a) から `depthKind = unknown` を除くのは FR-CONTRACT-4(ii) が marker と独立に warning を要求するため — 除外しないとテストが要件と矛盾する不変条件を固定してしまう。fixture はワークフロー中間状態(記入前ドラフト等)も含める(transient-state-fixtures)。
- 対角実測の記録: 改訂前 t415 × 改訂後正本の赤は、fix コミット後の一時 checkout で実測し復元(falling-proof-no-stash — pre-fix 面切替は checkout 限定・fix SHA 明示)。
