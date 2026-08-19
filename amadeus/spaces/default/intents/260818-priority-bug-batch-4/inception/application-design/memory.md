<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-18T08:25:00Z — 方式選定 2 問(FR-2837-1 / FR-3106-1)は要件が選挙裁定を明記するため、ソロ選挙 E-260818-PBB4-FIX-METHODS(fresh subagent 2名、blind、v2 複数 question)で裁定。Q1=C 2-0、Q2=A 2-0、全票 GoA 2。留保矛盾チェック(tally 直後の定型)を実施し相互補完と判定、runoff 不要
- 2026-08-18T08:25:00Z — ballot 初回提出は response の rationale フィールド欠落で decode 拒否(codec は reservation/rationale とも present な string|null を要求)。rationale: null の機械補完(投票内容不変)で再提出し受理。election-v2-ballot-contract 学習の既知面(submittedAt 位置・kind)は指示に織り込み済みで再発なし
- 2026-08-18T08:25:00Z — services.md はサービス不在の CLI フレームワークにつきサービス定義を作らず、変更が触る CLI 面の一覧と非適用根拠の記録に留めた(no-test-theatre 規律の設計面適用)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
