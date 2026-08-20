# Stage Diary — formal-model-check(single-stage run、spec-change advisory handoff)

## Interpretations

- 2026-08-20T08:12:00Z — 本ランは requirements-analysis 到達時の spec-change advisory(recorded verdict 不在、spec_identity 418efdb2…)の run-now handoff による明示 single-stage 実行。先行 applicability outcome を持たないため、ステージ本文 Step 1 の「explicit run」腕 = 全登録モデル(4本)を検査する。
- 2026-08-20T08:12:00Z — CI acceptance 経路(run-model-check-ci.ts)はローカルで構造的に ARTIFACT_VERIFY_FAILURE になるため(project.md cid:formal-model-check:c2)、run-model-check.ts の単一モデル経路 ×4 を --out repo外(scratchpad)で実行。

## Deviations

## Tradeoffs

## Open questions
- 2026-08-20T08:15:00Z — 4/4 モデル NOT_DETECTED(exit 0、completion-marker + state statistics あり)。runId: BoltPrAttestationGate 755c720d / FormalElection b35c7850 / MirrorLifecycle ef1702d6 / PrConvergenceGate 69dd6d3a。out は repo 外 scratch。plugin-activation record exit 0(完了済み検査後の正当な記録 — fmc-no-activation-record-on-not-applicable の発火条件を満たす)。

## Deviations(追記)

- 2026-08-20T08:16:00Z — §13 surface は single-stage 隔離では実行不能(tool が「Current Stage is requirements-analysis」で slug mismatch 拒否 — 単一ランは本線ポインタを動かさない設計)。学習候補なしとして記録のみ残す(候補に相当する観測は本 diary に記載済みで、本線ステージの §13 で回収可能)。
