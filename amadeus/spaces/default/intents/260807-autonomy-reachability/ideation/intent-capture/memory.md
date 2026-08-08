<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T11:35:00Z — 質問 0 件の 0問様式を採用; 本 intent は Issue #2378+クロスレビュー(run xrev-2378-20260807T110535Z)+ユーザー裁定で事前整理済みのため、ステージ既定4問はすべて既決として成果物へ直接反映(cid:intent-capture:c1)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-07T11:43:00Z — 【違反・ユーザー指摘】semi 有効下で §13 学習選定を AskUserQuestion で人間へ直接提示した(decide-question 梯子を経由せず)。これは #2378 仮説E の conductor 側再現実例 — 誘因は (a) stage-protocol の decide-question 操作手順が「under full」限定で semi の手順が不在 (b) 旧 solo-election ノルム(auto-solo-election 未設定→ユーザー裁定)が semi ToBe と競合。以後の質問裁定は amadeus-bolt decide-question 経由へ切替。requirements の完了条件3(engine 未経由質問の観測)・5(protocol semi 手順追記)の一次証拠として引用する

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-07T11:35:00Z — `--autonomy semi` 宣言後も amadeus-state.md の Intent Autonomy Mode 投影が none のまま(canonical audit は INTENT_AUTONOMY_TRANSACTION_COMMITTED で semi 記録済み) — write⇔observe 非対称の実測。requirements で扱う
- 2026-08-07T11:35:00Z — `--autonomy` は birth と同時に指定不可(`--autonomy needs an active intent` エラー実測) — 完了条件1「最初の質問より前」を新規 intent で満たすには birth 同時宣言の意味論裁定が必要
- 2026-08-07T11:35:00Z — 新経路のイベントは INTENT_AUTONOMY_TRANSACTION_COMMITTED(埋込 AUTONOMY_MODE_CHANGED)で AUTONOMY_MODE_SET は発行されない — 回帰計測(完了条件4)は測定述語の更新が必要
