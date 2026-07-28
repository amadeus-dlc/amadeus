<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T08:32:00Z — u5 §12a iteration 1 READY(Minor 2件 = field-missing の診断列欠落・docs TOPICS 台帳行欠落 → 受理前是正・センサー再 PASSED、u5 計20発火全 PASSED)。u5 は検収ユニットのため domain-entities は「契約構造(台帳・文書集合)の列挙」として充足(u3 の「新設エンティティなし」様式の類推)。
- 2026-07-27T08:21:30Z — u4 の FD は既存ユニット様式(裁定済み事項の再質問なし・questions ファイルなし)を踏襲。frontend-components.md は CLI intent につき条件不成立で非生成、不在を機械 assert(GSFFD13)。u4 §12a iteration 1 READY(Minor 1件 = domain-entities.md の components 装飾トークン → 受理前是正・センサー再 PASSED)。引用6点(config.ts:41/:335-339、lifecycle.ts:816/:843/:406-412)は起草前に conductor 実測、reviewer が独立照合。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-27T08:08:09Z — u3 §12a iteration 2 verdict NOT-READY(Major 2件)でレビュー予算(2)消費。E-LSSADS13 に基づき両件を機械検証可能クラスとして conductor が残余是正を適用: (1) amadeus-mirror-policy.ts の TERMINAL_BLOCK_STATUSES 引用 :55-64 → :61-65(conductor が sed 直読で再実測確定。u3 business-logic-model.md:19 / business-rules.md:16 に加え、record 全域スイープで同根の u2 business-logic-model.md:15 / business-rules.md:15 も是正 — cite-fix-sweeps-whole-record) (2) u3 domain-entities.md の completionProjectGate 戻り値を component-methods.md:72 の canonical フラット型 `{ ready: boolean; blocking: readonly string[] }` へ verbatim 復元(判別ユニオン形は無申告逸脱だった)。是正後センサー再発火 u2/u3 全12発火 SENSOR_PASSED / FAILED 0(audit 実測)。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
