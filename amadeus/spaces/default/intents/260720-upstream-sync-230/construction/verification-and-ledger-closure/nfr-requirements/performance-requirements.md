# Performance Requirements — verification-and-ledger-closure

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。24 item evidenceと必須gateを一回のclosureで評価し、service latency/throughput SLOは追加しない。

## 有界集約要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U12-01 | `traceCoverage`は24 item全数を自動testまたは明示docs検査へ対応付ける。 | 23/24以下を拒否。 |
| PERF-U12-02 | `assertPhaseVerification`はtargeted evidenceと必須gateを同じ最終SHAで一回評価する。 | 未実施・非0・古いSHAのgreen化0。 |
| PERF-U12-03 | `planLedgerTransition`は24 disposition、全gate green、最終SHAの三条件を同時に評価する。 | 条件別の早期write 0。 |
| PERF-U12-04 | 同一BLOCKED/APPLIED transitionの再実行は既存writerでno-opとする。 | duplicate history 0。 |

新parallelism、cache、retry、distributed ledger、時間閾値を追加しない。ledger writeは全verification後の最終operationだけとする。

## Verification gate

24/24 trace、EQUIVALENT、same-SHA gate、BLOCKED/APPLIED idempotency testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。push前local lcov patch追加行未カバー0、spawn seam、既決waiver証拠条件を満たし、未実施/stale結果をgreenへ読み替えない。

## トレーサビリティ

PERF-U12-01〜04は`business-rules.md`のBR-U12-01〜13、`business-logic-model.md`のTrace/Verify/Ledger workflows、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-20T23:54:20Z
- **Iteration:** 1
- **Findings:** なし（Critical 0 / Major 0 / Minor 0）。
- **Confirmed — seam / ownership:** public seamは`traceCoverage`、`assertPhaseVerification`、`planLedgerTransition`の正準3関数だけで、`classifyDisposition`は内部helperに留まる。U12はevidence集約、phase verification、ledger closureだけを所有し、機能実装を追加しない。
- **Confirmed — coverage trace / EQUIVALENT:** 24/24 itemを最低1つの自動testまたは明示docs検査へtraceし、23/24以下を拒否する。EQUIVALENTはupstream contract全体を満たすcharacterization evidenceだけに限定し、partial evidenceをgreenへしない。
- **Confirmed — FR23 / FR24:** 採用contractだけを再著作し、filesystem testをintegration-first、SKIP項目testを除外する。docsは英語正本/日本語pair、Amadeus path/namespace、6 harness、generated/hand-edit境界、legacy path 0を検査する。
- **Confirmed — verification / coverage:** targeted evidence、typecheck、lint、dist、promote、full CI、local coverageを同一最終SHAで検証し、未実施・非0・staleを拒否する。patch追加行未カバー0を必須とし、waiverは既決条件の明示証拠がある残余行だけに限定する。
- **Confirmed — ledger closed union:** 単なる未完了または三条件欠落はAPPLIED拒否、ledger/baseline不変、非BLOCKEDとする。構造化`verification-failure`/`abandon`だけを反証可能根拠付きBLOCKEDへ計画してbaselineを不変にし、24 disposition・全gate green・最終SHA成立時だけAPPLIEDとする。曖昧自由文や進行中はBLOCKEDにならない。
- **Confirmed — transition safety:** BLOCKED/APPLIEDは既存atomic ledger writerの最終operationを再利用し、同一transition再実行はno-opで履歴を増殖させない。新failure evidence、disposition、waiver、transition variant、atomicity、SLO、public APIはない。
- **Confirmed — stack:** Bun 1.3.13、TypeScript ESM、既存CI/coverage/docs/ledger writerと既存test runnerを再利用し、新dependency、service、database、network、UI、distributed ledger、別writerを追加しない。
- **Sensors:** applicable sensors 11/11 PASS。linter / type-checkはMarkdown-onlyのため非該当。
- **Scope decision:** 候補なし（追加readなし）。
