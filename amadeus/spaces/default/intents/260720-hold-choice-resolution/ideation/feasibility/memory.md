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

- [2026-07-20T02:57Z] Interpretation: feasibility:c1 の外部前提検証は非該当(内部 seam のみ)。主実測 = effective 合成(:378-385)の二値写像がギャップの実装点かつ合流先である特定。TallyResult の winner 不在(model.ts:312-314 実測)により #1268 の winner 描画経路が別実現である事実を RE 実測事項へ固定(A-1)。
- [2026-07-20T02:57Z] Interpretation: e4 並行合意(02:50:58Z)を C-1/R-2 に固定。

- [2026-07-20T03:00Z] Deviation: 初回 feasibility 実測が stale tree(team ブランチ working tree、#1268 以降の scripts/ 未取込)で行われ、「TallyResult winner 不在」の誤実測を成果物・ゲート報告に記載 — leader 照会(02:55:16Z)で捕捉。是正: origin/main を --no-ff マージ(289d162ae、parents=2 機械確認)し全引用を再実測 — TallyResult は winner+choiceCounts 保持(:411-418)、ギャップ実装点は rulingOverride 文字列合成(election.ts:390-392)へ訂正。原因 = 「git fetch 済み」を「working tree 追随済み」と混同した測定 ref の虚偽記載(measurement-ref-in-artifacts 違反実例、自己888ではなく leader 捕捉)。以後、seam 実測は git show origin/main: 直読か再接地後 tree で行い、測定 ref に HEAD SHA を必ず記す。
