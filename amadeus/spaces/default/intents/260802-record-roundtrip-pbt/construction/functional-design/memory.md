<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-08-02T18:15:15Z — state-pbt FD の P-ST3 受理ドメイン精密化(AD「改行を含まない」→実測で行終端子4種 LF/CR/U+2028/U+2029 + replace 置換パターン $ を除外)を、AD が「生成器の側で除外する」と委ねた中身の実測充填 = 執行クラスとして受理(setField 意味論は A-2 のまま不変)。scope-ledger FD の BR-SL-5(#1904 の分担先は出典不在につき「未割当(出典に記載なし)」と書き推測補完しない)も実測転記規律からの一意導出として受理。
- 2026-08-02T18:16:39Z — consumes-first-drafting 違反の同一セッション内2回目: conductor が FD 共通ブリーフの consumes を directive から機械転記せず記憶起草し(dependency/decisions を宣言と誤認、story-map/services 欠落)、6 unit×4成果物=24面の upstream-coverage FAILED → 機械是正で 48/48 PASSED。DP での1回目と同根 — ブリーフ経由で違反が6サブエージェントへ増幅された点が新しい。
- 2026-08-02T18:27:32Z — §12a reviewer 6体中2体(state-pbt/cast-guard 担当)が許可外パスを check-read 申告なしで読取したと自己開示(いずれも内容は FD 引用と一致・verdict へ影響なしと確認); prompt 明示だけでは read-only 境界が破られる既知パターン(cid:functional-design:c4-subagent-structural-guard)の reviewer 面での再現。verdict は成果物照合で独立に閉包確認済みのため受理。
