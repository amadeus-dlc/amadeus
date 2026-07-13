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

- 2026-07-12T06:46:00Z — Interpretation: product-lead 申し送り(1)「CI 時間の定量基準」を P-1/P-2 で解消 — 数値(timeout-minutes 5)は GitHub Actions の強制メカニズム由来(nfr-requirements:c3)で、P-2 は needs グラフ diff という機械検証に落とした。SC-1 の 16KB もテストアサートを強制メカニズムに指定。

- 2026-07-12T06:55:00Z — Deviation: reviewer iteration 1 = NOT-READY — P-2 の「needs グラフ diff で機械検証」は実在しない機構の引用で、申し送り解消の偽クロージャ主張だった(P2/検証劇場クラス、私の起草ミス)。実在可能な強制メカニズム(ci.yml parse の unit テストを U3 新設+着地後実 run 確認)へ書き換え、SC-2/R-3 整合・SC-1 の U2 伝播・P-3 機構特定も是正。上の 06:46 エントリの「解消」記述は本エントリで訂正される。
- 2026-07-12T07:00:00Z — Deviation: iteration 2 = 残2件 — (A) P-2 の新設テスト義務を U3 FD へ未伝播(同型の伝播漏れの反復 — SC-1 では正しく伝播したのに P-2 で欠落。私の系統的弱点として PM 材料申告) (B) 「parse」の曖昧性(構造 YAML パース=新規依存の危険)。是正: U3 business-rules #4 に t222-ci-snapshot-wiring.test.ts を具体名で新設義務化、方式は t152 :47-51 の文字列検査様式(依存ゼロ)に確定、P-2 と相互参照。
- 2026-07-12T07:05:00Z — Deviation: approve が artifact ガードに拒否(宣言パスは construction/{unit-name}/nfr-requirements/ — ステージ直下に置いた私の配置ミス、stage-artifact-declared-names の実例)。5成果物を主ユニット metrics-snapshot-cli 配下へ git mv(内容は U2/U3 横断だが正本は1箇所 — 二重化しない)。ガードが正しく機能した好例として記録。
