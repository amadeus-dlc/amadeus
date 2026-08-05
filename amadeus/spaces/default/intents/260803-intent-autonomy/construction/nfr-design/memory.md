<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T15:14:35Z — expected absenceのNFR Requirementsを捏造せずFunctional Designの確定契約をNFRオラクルにした; engine directiveはNFR Design実行を指示し、business-logic-model.mdに計算量、bounded state、trust boundary、failure semanticsが閉じているため
- 2026-08-03T15:22:46Z — Quality Repairの総修復回数capを追加せずnon-progress区間をTで閉じた; #2096はstrict progress中の継続と初回replan・次回repair-stalledを要求するため
- 2026-08-03T15:28:38Z — Intent grantを時間・回数で失効させずhuman revoke / downgradeだけでterminal化した; #2067のIntent-scoped authorizationとquality停止時もgrant保持する契約を維持するため
- 2026-08-03T15:34:06Z — completed reviewをoriginal seal外のreview-only extension chainへ限定した; 完了済みIntentのidentityとartifact digestを変えず事後確認を永続化するため
- 2026-08-04 — reviewer上限到達後、ユーザー選択AによりU4 Functional Designの公開cursor契約をsnapshot-bound設計へ同期し、レビュー反復を新しいサイクルとして再開した; NFR単独の上書きでは5 harnessのwire bytesを一意にできないため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T15:14:35Z — 数値SLOやクラウド構成を追加せず計算量・partition・atomicityで設計した; Issueにない運用目標を推測せず、短命CLIとper-clone auditの既存境界を維持するため
- 2026-08-03T15:17:06Z — no-effect後のredispatch上限をattempt 1のstarted event存在で耐久化した; 別event名やmutable counterを増やさず、許可発行とbudget消費を同じcanonical transactionへ閉じるため
- 2026-08-03T15:22:46Z — replan agent effectをreservation-firstとclosed reconciliationで隔離した; crash後の重複plan生成を防ぎつつgeneric Loop Monitorへquality意味論を持ち込まないため
- 2026-08-03T15:24:58Z — replan redispatchをattempt 1 successor reservationの存在で最大1回へ固定した; permit発行とbudget消費を同一canonical commitにし、crash replayでattempt 2を生成させないため
- 2026-08-03T15:28:38Z — decision selectionとeffect authorizationを別componentに分離した; confirmed policyやagent recommendationがpermission / waiverを暗黙取得しないようにするため
- 2026-08-03T15:30:05Z — park開始をreason / condition / optional latch / suspended projectionの単一transactionにした; crash後に再開条件のないsuspended状態やreasonだけの部分状態を公開しないため
- 2026-08-03T15:34:06Z — completed targetのhuman turnとreview appendをcross-Intent分散transactionにしなかった; source turnはauthorization evidenceに限定し、target appendをidempotentに再試行可能にするため
- 2026-08-03T15:36:23Z — pagination cursorをaudit revision / extension head / event-set digestへ束縛した; page間mutationを黙って混在させず明示conflictからfirst page再取得へ戻すため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
