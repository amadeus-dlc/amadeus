<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-03 — 差分リフレッシュの base は日付最新ではなく『HEAD の祖先のうち距離最小』で選んだ(rescan-base-ancestry)。全 re-scans の observed を祖先性判定にかけ a8e1ce025(距離42)を採用。
- 2026-08-03 — xrev scan mode を適用した(c1-xrev-scan-mode / c1-xrev-single-issue)。#1906・#1875 のクロスレビュー verdict が本 RE の observed と同一 SHA 498c3034a で検証済みのため、行番号再解決の免除条件が成立する。
- 2026-08-03 — reviewer 2名の実測が割れた論点(どの steal 経路が到達可能か)は RE の scan 段で決着させた。レビューは『欠陥の実在』までを担い、機序の一意確定は RE の仕事という切り分けが機能した。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-03 — 【訂正】当初「なし」と記載したが誤り。ユーザー指摘により再照合し、ステージ本文からの逸脱4件を確認した。虚偽記載そのものを第一の逸脱として記録する。
- 2026-08-03 — 逸脱1(実害あり): Step 1 Preflight「スキャン前に trunk を fetch/統合する」を未実施のまま Step 2 へ進んだ。事後実測で origin/main が6コミット先行しており、うち 52a082af7(#2136)が team.md を更新していた。差分リフレッシュの前提「最新の到達可能な codekb から差分を取る」が不成立の状態で合成した。
- 2026-08-03 — 逸脱2: Step 3「書込先は codekb-path で解決せよ、自分でパスを組むな」に反し、conductor が手でパスを組んで architect へ渡した。事後に codekb-path / codekb-path --re-scan を実行し、両パスとも手組み値と一致することを確認済み(結果は同値だが明示指示違反)。
- 2026-08-03 — 逸脱3: Step 2 が amadeus-developer-agent への委譲を指定しているのに Explore 型を使った。根拠は project.md c4-subagent-structural-guard(調査等の read-only 作業は explore に限定)だが、ステージ本文と衝突する以上 implementation-deviation-election に従い実装前に停止して裁定を仰ぐべきだった。ユーザー裁定(2026-08-03): Explore を正とし、以後の RE もこれに従う。
- 2026-08-03 — 逸脱4: Step 5 の完了提示を stage-protocol.md の完了テンプレートに従わず独自形式で行った。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-03 — 機序の実証にフル coverage 負荷を使わず(norm c1-coverage-single-owner による相互破壊回避)、repo 外 scratch で amadeus-lib.ts を直接 import する 20 並列ハーネスを組んだ。結果として起票時の『1/2 回』より決定的な再現(branch B で 6/6)が得られ、trade は成立した。
- 2026-08-03 — Developer スキャンを Explore 型(書込不可)で実行し、書込を伴う合成のみ architect へ渡した(project.md c4-subagent-structural-guard)。スキャン側が成果物を書けない分の受け渡しコストを、engine 誤操作リスクの排除と交換した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-03 — #1875 の canonical 定義選択: 生カウント(R)と EXECUTE 実効(E)が既存テストで矛盾ピン留めされているため(R: tests/e2e/t52-*, t-tui-kiro-fix-scope.serial / E: tests/integration/t394-*)、どちらへ寄せても既存テストが壊れる。要件段の裁定が実装の前提。
- 2026-08-03 — 生存 PID の over-age 横取りを維持(ハートビート付与)するか撤廃するか。撤廃は wedge した保持者の回収経路を失う — amadeus-audit.ts:429-433 が現挙動を意図的と明記している。
- 2026-08-03 — ロックバケット統一と未ロック RMW の施錠を本 intent のスコープに含めるか。t164 がバケット意味論をピン留めしており、withLockedIntentRegistry は intents.json 用に意図的に workspace スコープ。
- 2026-08-03 — Bolt を直列化するか、スキャンが示した唯一のクリーンな分割(Bolt A = amadeus-lib.ts のロックプリミティブのみ / Bolt B = #1875)で並行させるか。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
