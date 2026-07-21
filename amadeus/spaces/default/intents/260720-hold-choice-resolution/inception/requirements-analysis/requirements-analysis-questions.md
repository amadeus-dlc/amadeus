# Requirements Analysis — 明確化質問(260720-hold-choice-resolution)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **判定**: 全3問とも**選挙必須**(真に未決 — Q1 は正準リスト(4)該当性のノルム解釈、Q2/Q3 は設計判断。C-4 単独決定禁止)。leader へ blind 選挙の開催を依頼。裁定受領後に [Answer] 記入(election-answer-after-ruling)。
> 実測コンテキストは scan-notes.md(RE 一次資料)に依拠。推奨は伏せた中立事実のみ記載(アンカリング防止)。
> 裁定受領: E-HCRRA1〜3 開票(leader 通知 03:59:29Z、正本 = leader ブランチ dfb076f01 の elections/E-HCRRA{1,2,3}/record.md — Q3=B のユーザーエスカレーション承認追記込み)。

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

## Q1: choice 指定 resolution の追加は「ユーザー可視契約の変更」(正準リスト(4))に該当するか?

実測コンテキスト: E-TCRCG は B 案(hold-resolution の choice 語彙化 = HOLD_RESOLUTIONS・t236 期待変更)を「ユーザー可視契約の変更 → 採用時はユーザーエスカレーション」と注記した。本 intent の対応方向は既存二値(tie: adopted/rejected — E-TCRCG=A で維持)を**変更せず**、tie に choice 指定の**新値を追加**する形(Issue #1267 の対応方向)。既存の受理値・既存出力(裁定: 採用/不採用)・既存テストピン(t236:310 系)は不変で、新入力に対する新出力(裁定: <choice label>)だけが増える。

- A. 非該当 — 既存契約の変更を伴わない追加(受理域拡大)であり、エスカレーション不要。RA はこの判定を成果物に明記して進行
- B. 該当 — 新しい CLI 受理値と record 出力形の導入自体が契約変更。実装前にユーザーエスカレーションで承認を得る
- C. その他(note に判定枠組みを明記)

[Answer]: A(E-HCRRA1 裁定 2026-07-20 開票、3-0。留保転記(e3, GoA2): 非該当成立条件(既存受理値・出力・t236:310 系ピンの不変)を要件に明記し、崩れたら再判定 / 留保転記(e4, GoA2): RA 成果物に判定根拠3点(既存受理値不変・既存出力不変・既存テストピン不変 — いずれも実測)を明記し、『スコープが既存語彙の置換・除去(E-TCRCG の B 案型)へ滑った瞬間にユーザーエスカレーションへ切替える』条件を1行固定(E-HCRRA3 で B 採用なら自動的にエスカレーション束ね) / 留保転記(e1, GoA2): 非該当判定は『純追加(既存受理値・既存出力・既存テストピンの全てが不変)』が成立する場合に限る — Q3=B(tie 二値の除去=受理域縮小)採用時は該当へ反転しユーザーエスカレーションへ束ねる。**注記: Q3=B 採用により e1 留保(該当へ反転)が発動し、ユーザーエスカレーション実施 → B 承認済み(03:47Z 台、E-HCRRA3 record 追記)— 反転条件は充足済み**)

## Q2: choice 指定の CLI 構文はどれか?

実測コンテキスト: 受理面は handleHoldResolved(election.ts:190-226)で、resolution は既存 `--resolution <値>` フラグの文字列(FLAG_FIELDS :505)。検証は HOLD_RESOLUTIONS テーブル引き(:201-207、Record<string, ElectionState> — 未知値 fail-closed)。tie の choice は election.json の choices[].internalNo(数値)で識別される。

- A. `--resolution choice:<internalNo>`(既存フラグの値文法拡張 — Issue #1267 例示形。テーブル検証は prefix parse+internalNo 実在照合の二段へ)
- B. 新フラグ `--choice <internalNo>` を併設(`--resolution` は二値専用のまま — フラグ責務分離、FLAG_FIELDS 追加)
- C. その他(note に構文明記)

[Answer]: A(E-HCRRA2 裁定 2026-07-20 開票、3-0 — --resolution choice:<internalNo> の値文法拡張)

## Q3: tie の既存二値(adopted/rejected)と choice 指定の共存形は?

実測コンテキスト: HOLD_RESOLUTIONS.tie = {adopted, rejected}(:70)。t236 の既存ピンは block 経路のみで tie の二値を直接ピンするテストは不在(RE 実測)。E-TCRCG=A は「hold 裁定行の二値表現維持」を裁定したが、その主対象は当時の全 hold 共通語彙 — tie 固有の語彙集合の増減は未裁定。二値の tie における意味論は「多肢で adopted が何を指すか」が曖昧(#1267 の元問題)。

- A. 共存 — tie は {adopted, rejected, choice:<n>...} を受理(既存二値の後方互換を維持。二値使用時の裁定行は現行どおり)
- B. tie のみ choice 指定へ置換 — tie から adopted/rejected を除去(受理域の縮小 = 契約変更につき、採用時は Q1 の判定に関わらずユーザーエスカレーションへ束ねる)
- C. その他(note に方式明記)

[Answer]: B(E-HCRRA3 裁定 2026-07-20 開票、choice 多数 2-1+**ユーザーエスカレーション承認で確定**(03:47Z 台)。留保転記(e3, GoA2): 置換は tie 限定・block/discussion/quorum の語彙不変を要件に明記、エスカレーションは必須手順として RA 成果物に固定 / 留保転記(e1, GoA2): 除去は tie 語彙限定(他 reason の二値は E-TCRCG=A どおり不変)、受理域縮小につきユーザーエスカレーションへ束ねる(実施済み) / 留保転記(e4, GoA2): 多肢 tie での二値使用の曖昧受理を無音で通さない設計義務 — B では tie の二値が loud 拒否となる実装が該当。二値が自然な単一提案型(s13-adoption)との使い分けを docs に1行)
