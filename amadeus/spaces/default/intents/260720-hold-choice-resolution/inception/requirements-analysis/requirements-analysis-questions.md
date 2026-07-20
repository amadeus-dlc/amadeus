# Requirements Analysis — 明確化質問(260720-hold-choice-resolution)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **判定**: 全3問とも**選挙必須**(真に未決 — Q1 は正準リスト(4)該当性のノルム解釈、Q2/Q3 は設計判断。C-4 単独決定禁止)。leader へ blind 選挙の開催を依頼。裁定受領後に [Answer] 記入(election-answer-after-ruling)。
> 実測コンテキストは scan-notes.md(RE 一次資料)に依拠。推奨は伏せた中立事実のみ記載(アンカリング防止)。

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

## Q1: choice 指定 resolution の追加は「ユーザー可視契約の変更」(正準リスト(4))に該当するか?

実測コンテキスト: E-TCRCG は B 案(hold-resolution の choice 語彙化 = HOLD_RESOLUTIONS・t236 期待変更)を「ユーザー可視契約の変更 → 採用時はユーザーエスカレーション」と注記した。本 intent の対応方向は既存二値(tie: adopted/rejected — E-TCRCG=A で維持)を**変更せず**、tie に choice 指定の**新値を追加**する形(Issue #1267 の対応方向)。既存の受理値・既存出力(裁定: 採用/不採用)・既存テストピン(t236:310 系)は不変で、新入力に対する新出力(裁定: <choice label>)だけが増える。

- A. 非該当 — 既存契約の変更を伴わない追加(受理域拡大)であり、エスカレーション不要。RA はこの判定を成果物に明記して進行
- B. 該当 — 新しい CLI 受理値と record 出力形の導入自体が契約変更。実装前にユーザーエスカレーションで承認を得る
- C. その他(note に判定枠組みを明記)

[Answer]:

## Q2: choice 指定の CLI 構文はどれか?

実測コンテキスト: 受理面は handleHoldResolved(election.ts:190-226)で、resolution は既存 `--resolution <値>` フラグの文字列(FLAG_FIELDS :505)。検証は HOLD_RESOLUTIONS テーブル引き(:201-207、Record<string, ElectionState> — 未知値 fail-closed)。tie の choice は election.json の choices[].internalNo(数値)で識別される。

- A. `--resolution choice:<internalNo>`(既存フラグの値文法拡張 — Issue #1267 例示形。テーブル検証は prefix parse+internalNo 実在照合の二段へ)
- B. 新フラグ `--choice <internalNo>` を併設(`--resolution` は二値専用のまま — フラグ責務分離、FLAG_FIELDS 追加)
- C. その他(note に構文明記)

[Answer]:

## Q3: tie の既存二値(adopted/rejected)と choice 指定の共存形は?

実測コンテキスト: HOLD_RESOLUTIONS.tie = {adopted, rejected}(:70)。t236 の既存ピンは block 経路のみで tie の二値を直接ピンするテストは不在(RE 実測)。E-TCRCG=A は「hold 裁定行の二値表現維持」を裁定したが、その主対象は当時の全 hold 共通語彙 — tie 固有の語彙集合の増減は未裁定。二値の tie における意味論は「多肢で adopted が何を指すか」が曖昧(#1267 の元問題)。

- A. 共存 — tie は {adopted, rejected, choice:<n>...} を受理(既存二値の後方互換を維持。二値使用時の裁定行は現行どおり)
- B. tie のみ choice 指定へ置換 — tie から adopted/rejected を除去(受理域の縮小 = 契約変更につき、採用時は Q1 の判定に関わらずユーザーエスカレーションへ束ねる)
- C. その他(note に方式明記)

[Answer]:
