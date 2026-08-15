# Business Rules — unit recommendation-core(U1)

> 各規則は FR / ADR / 選挙留保のいずれかへ trace する。R-* はテスト可能な述語として書く。落ちる実証(Red)の期待は §落ちる実証 に集約する。

## 型と構築の規則

**R-1**(FR-1、ADR-1): 裁定の結果は `unique` / `contested` / `none` の 3 種のみで表現する。第 4 の状態(「推奨なしだが進む」「confidence 低」等)を型に追加しない。
検証: `RecommendationOutcome` の判別子集合が 3 要素であることの型レベル網羅性テスト(switch の exhaustiveness)。

**R-2**(component-methods.md C1): `contested` は候補 2 件以上でのみ構築できる。1 件以下での構築は例外を送出し、値が存在しない。
検証: 候補 0 件 / 1 件での構築が throw することを実測。

**R-3**(component-methods.md C1、construction.md「Parse, Don't Validate」): 外部表現からの復元は `parse` のみを入口とし、`Result<RecommendationOutcome, DecodeError>` を返す。未知の判別子・欠落フィールド・型不一致はすべて error 枝で、既定値補完をしない。
検証: 不正 JSON 3 種(未知 kind / candidates 欠落 / fingerprint 非 SHA-256)が error 枝を返すことを実測。

**R-4**(RFC-0001 Reference-level UX 契約、FR-1): `presentationOf` の出力は (a) 候補列挙 (b) 各候補の根拠 (c) 一意に決まらなかった理由 (d) 推奨順 の 4 要素をすべて持つ。いずれかが欠けた提示は生成できない。
検証: contested の presentation が 4 要素すべてを非空で持つことを実測。none の場合は理由が非空であること。

**R-5**(project.md「新設・変更する永続化境界には round-trip プロパティを標準観点として付ける」): 任意の妥当な `RecommendationOutcome` について `parse(serialize(o))` は元と等価な値を返す。
検証: fast-check による round-trip プロパティ(固定 seed・低 numRuns で PR CI に常駐)。

**R-6**(ADR-11): `RecommendationBasis.fingerprint` は本 unit では不透明な SHA-256 文字列として扱い、算出規則を本 unit に置かない。正規化規則は code-generation への申し送り入力である。
検証: 本 unit のソースに fingerprint 算出の実装が存在しないことの文書・構造検査(型定義と検証述語のみ)。

## 梯子の規則

**R-7**(FR-4、ADR-1): `resolveAutoDecision` が `AutoDecisionRecord` を生成するのは終端が `unique` のときに限る。`contested` / `none` 終端は escalate 枝を返し、`decisionRecord`(`amadeus-intent-autonomy.ts:818-849`)へ到達しない。
検証: contested 終端を返す capability を注入したとき、`AutoDecisionRecord` が 1 件も生成されないことを実測。

**R-8**(FR-4、本 unit FDQ-2): history 段の競合(`uniqueOption` が `"conflict"` を返す状態)は `contested` を返して終端する。現行 `amadeus-intent-autonomy.ts:952` の `history !== "conflict"` による次段への落下を廃止する。
検証: 過去人間裁定が 2 選択肢に割れた入力で、④ solo-election / ⑤ agent-recommendation が **呼ばれない** ことをポートの呼び出し記録で実測。

**R-9**(FR-4): 梯子⑤(agent-recommendation)は `contested` / `none` を返す自由を持つ。⑤ に到達したことが自動的に決定を意味しない。
検証: ⑤ が contested を返す capability での終端が escalate であること。

**R-10**(RFC-0001 Q1=A、FR-1): 選挙 hold(不成立 5 事由 — tie / block / split / quorum-short / discussion-needed)は `contested` または `none` へ写像する。hold を `unique` へ丸めない。
検証: 5 事由それぞれの入力に対する終端種別の対応表テスト。

**R-11**(FR-15、ADR-1): norm 段の競合は `park("NORM_CONFLICT")` のまま(`:943`)、導出結果の不正は `invalid` のまま(`:958-960` / `:967-968`)保持する。これらを `contested` へ吸収しない。
検証: 既存の NORM_CONFLICT / invalid テスト群が無改変で Green。

**R-12**(RFC-0001 Guide-level「裁定の順序」): 裁定順序 1(人間専権)の判定は導出より **前** に行う。人間専権事項では推奨が unique でも自動裁定しない。
検証: 人間専権 occurrence に対し、unique を返す capability を注入しても AUTO_DECIDED が生成されないこと(判定の所有は U5 だが、本 unit の導出は専権判定を上書きしないことを pin する)。

## ゲートの規則

**R-13**(ADR-1 Q2=B): ゲート導出器 `deriveGateRecommendation` は常に `unique("approve", basis)` を返す。contested / none を返す経路を持たない。
検証: ゲート導出器の全入力分岐で終端が unique であることを実測。

**R-14**(ADR-1、FR-15): blocking sensor 未解決および NORM_CONFLICT は導出器に到達する前の既存 fail-closed 経路で止まる。導出器の戻り値でこれらを表現しない。
検証: 既存 guardDenied 経路のテストが無改変で Green(無退行)。

**R-15**(FR-15 無退行): `commitProductionStageGateDecision` の外部観測挙動(承認の成否、occurrenceId 重複時の `already-decided`、`not-authorized` の理由文字列)は改修前後で不変。
検証: 既存のゲート決定テストが無改変で Green。とくに occurrenceId 重複判定(`amadeus-intent-autonomy-production.ts:805`)の分岐が保たれること。

## 発火頻度の規則

**R-16**(ADR-9): 機構起因クラス(RFC-0001 付録 B の phase-gate 106 件 + walking-skeleton 66 件 = 172 件クラス、および §13 0 件確認 79 件クラス)を再現する fixture、および通常進行 fixture で、contested の発火件数は 0 件である。
検証: fixture 群の実行結果からの機械集計。割合閾値は導入しない(ADR-9 が明示的に棄却)。

**R-17**(ADR-9): contested の発火件数と裁定点クラスは metrics スナップショットの観測項目として出力できる形にする(閾値の裁定は次 intent)。
検証: 観測項目が集計コマンド出力から再導出可能であること。

## 落ちる実証(実装前に Red で実測すべきもの)

FP-1 と FP-2 は FR-1 / FR-4 の受け入れ確認が名指す実証である。TDD 既定(team.md Testing Posture)により、実装前に赤を実測してから最小実装で緑にする。

| # | 何を注入するか | Red が示すべきこと | trace |
|---|---|---|---|
| FP-1 | 過去人間裁定が 2 選択肢に割れた `pastHumanRulings` を `resolveAutoDecision` へ与える | 現行実装は `:952` で競合を捨て ④/⑤ へ落ち、最終的に `decided` を返す — **非一意が表現できず自動裁定される** | FR-1 受け入れ確認、FR-4、D4 |
| FP-2 | ⑤ で「候補が複数」を表現しようとする | `DecisionCapabilityPort.recommend`(`:801-806`)の戻り型が単一 optionId 固定で、候補列挙を渡す語彙が存在しない(コンパイル不能) | FR-1 受け入れ確認(「推奨導出が常に 1 件」) |
| FP-3 | contested 終端の outcome を直列化 → 復元しようとする | 型・直列化面が存在しないため往復できない(R-5 の対象面が不在) | FR-1 の UX 契約(非対話中断時の再提示) |
| FP-4 | ゲート導出器から contested を返す | ADR-1 に反する形が **型として構築できない** ことを pin(赤ではなく到達不能性の実証。Red の代わりに構造検査で示す) | ADR-1 Q2=B |

FP-1〜FP-3 は注入 → 赤の実測 → revert を 1 セットで実施し、残渣ゼロを機械確認する(team.md「落ちる実証は不可分の 1 セット」)。注入先は対象テストが実際に読む面かつ実行時に消費される行に限る。
