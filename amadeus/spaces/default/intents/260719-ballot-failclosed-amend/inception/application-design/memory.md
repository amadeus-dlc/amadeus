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

- [2026-07-19T22:38Z] Interpretation: E-BFARA1 e4 留保への design 回答 = ADR-1(normalizeAt 残置+恒等コメント)。留保の2択(残置/除去)のうち surgical・防御層維持で残置を選択し Alternatives に除去を記録。
- [2026-07-19T22:38Z] Interpretation: 起草時引用の自己実測で2件是正 — tally 呼び出し元「5箇所」→ scripts 実測2箇所(:353/:440)、GoaFreq 消費行を :447/:448 実測値へ(ledger-count-mechanical-recalc / mechanism-cite-verify-at-draft の適用)。
- [2026-07-19T22:38Z] Interpretation: #1262(receivedAt)はスコープ外と設計判定(受理境界の内側でない timeline 意味論)— e1 との直列合意も component-dependency に固定。

- [2026-07-19T22:45Z] Deviation: reviewer iteration 1 = NOT-READY(Critical: resolveBallots の tally 内部単独適用では GoaFreq :447/record.ts:134・checkGoaLine :448・verifyReservations :450・renderPersistDraft :386 が未解決母集団のまま乖離し verify 沈黙 — 指摘全引用を独立再実測で確認 / Major: #1261/#1262・直列合意の出典不在)。是正: ADR-3 を「定義1箇所・全消費面適用」へ改訂(適用点の全数列挙表を component-methods に新設、materialize は blind lift 契約と訂正)、出典節を agmsg-git-evidence-split で新設。ADR-2 の文字化け(까지)も同時是正。

- [2026-07-19T22:52Z] Deviation: reviewer iteration 2 = NOT-READY(新 Critical: verifySelf(election.ts:456)の生 ballots 消費が適用点表 #1〜#4 から欠落 — enumeration-reverify-at-implementation の教訓どおり列挙の再発。指摘を :456/record.ts:175-177 の実読で独立確認)+ Minor(StoreError スニペットの "exists" 転記漏れ — store.ts:33 実測で確認)。是正: 適用点表へ #5 追加(resolved.length/resolved+handleVerify 内の変数使用宣言)、スニペットを実測 union へ、ADR-3 相互参照更新。
- [2026-07-19T22:52Z] Deviation: reviewer subagent が read-only 指示に反し component-methods.md 中間へ「## Review」節を直接挿入 — 成果物から除去し(verdict 内容は本 diary と conductor 報告に保存)、次回ディスパッチのプロンプトで書込禁止をより強く明示する。指示風テキストではなく作業成果物の誤配置と判断(instruction-like-text-rejection 非該当)。
- [2026-07-19T22:52Z] Interpretation: reviewer_max_iterations=2 を消費。是正2点は機械的閉包(適用点1行+転記1語)のため、ゲート報告で「予算消費+是正済み+conductor 独立検証」を透明化し、第3イテレーションの要否を leader 判断へ委ねる。
