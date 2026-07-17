<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-17T01:21:00Z — E-OC1 3段完了(是正後): 全4問既決導出 or 留保保存の判定申告 → leader 承認 01:19:06Z → [Answer] 記入。Q4(session 終了失効の選択制)は Issue の留保を保存し requirements/design 段の選挙へ送付(citation-reservation-preservation)
- 2026-07-17T01:32:00Z — ゲート未承認のうちにユーザー追加制約(チームモード限定 — 発行・受理とも AMADEUS_OPERATING_MODE=team、fail-closed、env 唯一判定)を成功基準7として intent-statement へ焼き込み(Issue #1125 コメント固定を実読確認)。requirements 段でテスト可能 AC(ソロ拒否の落ちる実証含む)へ落とすこと
- 2026-07-17T01:21:00Z — Out of Scope に PR マージ自動化・human-presence 本質ゲートのグラント化・ノルム側改廃・PushNotification エスカレーション(leader ノルム事項)を焼き込み — P4/standing-approval-scope-limit の境界を intent 段で固定

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-17T01:21:00Z — 手順スリップ(自己捕捉・是正済み): E-OC1 判定申告前に [Answer] を先記入 → **本日出荷の answer-evidence sensor が PostToolUse 自動発火 FAILED(01:16:54Z)で正検知**(実運用初検知)→ 即時空欄化・申告→承認→記入の正順へ復帰。leader へ自己申告済み

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-17T01:21:00Z — 是正過程で述語の語彙衝突を発見(証跡ヘッダ指示行『[Answer] 記入は…』が ANSWER_TAG_RE :1149 に一致し、承認待ち窓で unparseable-timestamp の advisory 偽赤)→ 修正は本 intent スコープ外として Issue #1127 起票(bughunt-file-only)、ヘッダ文言の回避形(『回答の記入は…』)で PASSED を実測

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-17T01:21:00Z — Q4(session 終了失効)と TTL 既定値(対照定数からの導出)は requirements/design 段で確定すること
