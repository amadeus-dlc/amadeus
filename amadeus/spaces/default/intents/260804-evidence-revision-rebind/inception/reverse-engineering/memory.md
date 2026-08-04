<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-04T02:00Z — xrev scan mode を単発の Issue #2156 へ適用した。行番号再解決の免除判定は **APPLIES** — 根拠は base 区間での touch の有無ではなく、両 verdict の `target-sha` が observed(`9458bbda8`)と一致することである(`cid:reverse-engineering:c1-xrev-single-issue` / E-OBB5-RES13 の免除条件)。実際には患部9ファイルは base 区間 `498c3034a..9458bbda8` で touch されているが、検証 SHA == observed のため免除は成立する。
- 2026-08-04T02:00Z — センサー3種のうち answer-evidence は filter(`**/*-questions.md`)不適合で codekb 成果物に構造的に非適用(`cid:reverse-engineering:re-sensors-codekb-filter-mismatch`)。required-sections / upstream-coverage は9成果物へ手動発火し 18/18 SENSOR_PASSED、FAILED 0。本ステージに reviewer 宣言はなく §12a は非適用。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-04T02:00Z — Issue #2156 本文とクロスレビュー2名がともに前提にしていた「evidence bundle の再 adoption は生成ツール不在のため不能」を、スキャンが**反証**した。3層の不動点計算(SHA 置換 24/24/25 → `adoption-runs.json` の sha256 を manifest の 25 artifact エントリへ再計算 → 23 receipt の `evidenceDigest` 再計算)で `validateEvidenceRegistry: ok:true` / `t413: 10 pass 0 fail` / gate `NO_SILENT_DROP_OK` に閉じる。conductor が scratch clone で独立再現済み。訂正を Issue へコメントし、codekb には反証後の理解のみを記録した。不在なのは再生成ロジックではなく**書込経路**(`tests/no-silent-drop/` 配下の `.ts` に書込 API 0件)。
- 2026-08-04T02:00Z — 両レビュアーが INCONCLUSIVE とした「`baseline-proof` は再バインド後に構造的に再現しない」も反証された。当該エラーは再バインド非依存で、`bootstrap.ts:493-495` により「ベースに `baseline.json` が存在しない場合」にのみ発火する。記録コマンドどおりの `--base-revision 9e699ea79...` では再バインド前後とも exit 0 / pass。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-04T02:00Z — Developer scan と Architect 合成を別 subagent へ直列委譲した(`cid:reverse-engineering:c3`)。conductor はコンテキストを温存し、決定的主張(3層不動点による閉包)のみを scratch で独立再現して裏取りした。件数(24/23/24/25/25)は Architect が独立再計算し Developer 記録と全一致。
- 2026-08-04T02:00Z — Developer scan・Architect 合成とも、resume 前にターンを終える挙動を1回ずつ示した(`cid:requirements-analysis:c4-agent-async-despite-sync-flag` の再現)。ディスク上の成果物実在を有界ループで監視し、未書込を検知して worktree パス再掲つきで resume した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-04T02:00Z — Requirements Analysis へ送る未裁定事項3件: (1) 恒久解の方式 — 「着地後に main SHA へ再バインドする経路」か「PR ブランチ SHA を記録できない構造」か(即時再バインドだけでは次に registry を更新する PR で再発する)、(2) `bootstrap-provenance.json` の同クラス破損(candidate digest 乖離が `a2f08658e` 起点、`bootstrap.ts:331` の等値破れ、fallback の恒久 fail-closed)を本 intent の射程に含めるか、(3) #2153(`t413:165-173`)との関係 — 独立の欠陥だが同一 test 名を共有するため片方修正では test 単位の赤が残りうる。
- 2026-08-04T02:00Z — 新規所見(e): 直前 intent `260803-state-integrity` の observed `6c15af23a` が本 observed の**非祖先**(`git merge-base --is-ancestor` exit 1)。ローカル merge を observed に記録したことによる非祖先化で、`cid:reverse-engineering:c2-observed-mainline-commit` が防ごうとした事象の現存実例。

