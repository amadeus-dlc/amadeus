<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T10:35:00Z — xrev scan mode を適用（cid:reverse-engineering:c1-xrev-single-issue）; #2352 はクロスレビュー2名成立済み（reviewer-1/reviewer-2 の verdict が検証 SHA 75a1c198d と file:line を明記）で条件を満たす。Developer scan の一次入力に両 verdict、conductor 二重化は base/observed 実測と cmp 区間照合で実施
- 2026-08-07T10:35:00Z — 行番号 currency は E-XBB-RE-S13-c2 の区間実測で確定; review SHA→observed で amadeus-lib.ts は +143 行だが全て :4983 着地、患部区間 210-360 は cmp IDENTICAL（exit=0）。免除の適用ではなく区間実測による currency 確定
- 2026-08-07T10:35:00Z — 差分リフレッシュ base は b8e3e664f（re-scans の observed 候補から HEAD 祖先・距離最小12 commits で選定、cid:reverse-engineering:rescan-base-ancestry）; observed は 4a3da7d62（worktree HEAD = origin/main 系譜、cid:reverse-engineering:c2-observed-mainline-commit）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-07T10:35:00Z — re-artifacts.md の Developer Code Scan Template は greenfield 全域スキャン向け節構成のため、xrev differential では依頼9項目を主構造とし、テンプレの証拠規律（file:line + verbatim + exit code、事実/仮説分離）のみ適用（scan 側申告を追認）
- 2026-08-07T10:35:00Z — reviewer-2 由来の「144 worktree 中 7件 INVALID」全域再計数は worktree 隔離ガードが他 worktree を跨ぐ実行を拒否したため未実施; marker 不成立の構造的根拠（.claude/tools が git ls-files 0件 = 未追跡生成物）のみ observed で確定

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
