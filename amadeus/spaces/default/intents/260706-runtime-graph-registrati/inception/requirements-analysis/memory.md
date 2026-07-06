<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T07:05:00Z — Issue の「自動 compile または復旧手順つき明示エラー」は二者択一ではなく両立で FR 化した（FR-1 = hook regex 修正で主経路を直し、FR-2 = surface 自己修復 + 復旧手順エラーで harness 非依存の safety net）。根拠は RE 実測の根本原因（regex 素通し）と、本 Intent での決定的証拠（.claude/tools/ 経由 report で hook 発火・登録成功）。
- 2026-07-06T07:05:00Z — questions は Issue・ディスパッチ・RE 実測からの出典付き自己回答 4 問。新規の人間質問はない（bugfix scope の縮退運用）。

- 2026-07-06T07:20:00Z — reviewer NOT-READY（H1/M1/M2/L1）を全件反映。H1 = FR-2.1 の採用根拠（fail-open drops、hook 非発火文脈、ディスパッチの名指し）を要求文書内に自己完結化。M1 = compile 自体の失敗も復旧手順つきエラーへ（fail fast、e2e ケース (b) 追加）。M2 = parity 宣言状況を実測 conclusion 化（runtime-compile 未宣言 → 追加、learnings 宣言済み → reason 追記）。L1 = NFR-1 の B002 非接触を git show --stat で実測し記録先を明記。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T07:05:00Z — regex は .kiro / .codex も同時対応するが実機検証は対象外（スコープ外に明記）。過剰な harness 網羅より、観測済み実害（.agents 経由）の決定論的検証を優先した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
