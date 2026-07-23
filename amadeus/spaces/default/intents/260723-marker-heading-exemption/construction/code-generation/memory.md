<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T03:32:12Z — degrade スコープにつき成果物は construction/fix-1296-marker-heading-exemption/code-generation/ の unit ディレクトリ様式(cid:degrade-scope-unit-dir-layout)。builder は本線ツリー単独実装(並行 writer なし — c2 隔離は並行時規律)
- 2026-07-23T03:32:12Z — builder 申告の列挙外変更2件(t155 既存 ineligible テストの pass assert 反転)を conductor 裁定: 両テストは修正前バグ挙動(marker の floor fail)を固定しており、承認済み FR-1(marker 免除)の機械的帰結として反転必須 — 一次証拠(diff 直読: ELIGIBILITY GATE の config_warning/template:ineligible assert は保持、変更は floor pass 値のみ)から一意に導出される執行であり選挙不要(cid:always-elect の執行 carve-out)。§12a reviewer の独立検分対象として申告を保存
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T03:32:12Z — builder 検証(typecheck/lint/dist:check/promote:self:check/t155 18 pass/t86 16 pass)を conductor が全数再実行し全 exit 0 で裏取り(cid:evidence-discipline)。FR-7 閉包も配布コピーで再実測: timestamp/questions 両面 pass:true+marker_exempt:true
- 2026-07-23T03:37:26Z — reviewer READY(iteration 1、Minor3件 = conductor 実測条件)を全数閉包: (1) touch ファイル数 6(git stat 実測)→ plan 見出しの算術誤り(6+2=8)を 4+2=6 へ是正(ledger-count-mechanical-recalc 違反実例、PM 回付) (2) corpus sweep を全数へ拡大 — 非 marker 3,056+marker 414 の述語直接適用で wrongFloor/wrongExempt 0(FULL SWEEP: PASS) (3) same-root grep: t155 残存 pass:false は全て prose 名(:203/:248/:275/:301 文脈直読)、他4ファイルは required-sections 非参照 — marker pass:false の固定は他に残存なし
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
