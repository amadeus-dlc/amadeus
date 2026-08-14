<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-14T07:45:00Z — 先行 applicability outcome のない explicit `--single` 実行。ステージ本文 Step 1 に従い `model-map.json` の登録4モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)を宣言順に検査し、完了後に `plugin-activation.ts record` した
- 2026-08-14T07:54:00Z — §13 `learnings surface --slug formal-model-check` はホストの Current Stage が requirements-analysis のままなので slug mismatch で拒否。isolated `--single` のため persist は行わず、観測は本 diary に残す
- 2026-08-14T11:38:00Z — rebase 後の spec identity に対し登録4モデルを宣言順で再検査し、全件 `NOT_DETECTED` と completion marker を実測した
- 2026-08-14T12:20:00Z — 本線の先行 applicability outcome は承認済み `impl-only`。ステージ本文 Step 1 に従い TLC を呼び出さず、終端判定を `NOT_APPLICABLE` とした

## Deviations
- 2026-08-14T07:48:00Z — 最初に worktree 内 `--out` を事前作成して渡し `OUT_CONFLICT`(exit 2)。ローカル正規経路は親だけ実在するワークスペース外の未作成パスなので `/tmp/amadeus-fmc-failopen-error-paths/<M>` へ切り替えた。誤作成した in-tree `out/` は削除済み
- 2026-08-14T11:38:00Z — 全件 CI runner は Docker bind source 不在で `HARNESS_ERROR` となったため、ステージ本文が示す正規 `run-model-check.ts` を各登録 model/cfg pair に適用した。各 run は実 TLC 出力、状態統計、completion marker を生成した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
