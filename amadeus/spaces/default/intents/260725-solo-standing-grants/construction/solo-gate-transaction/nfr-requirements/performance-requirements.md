# Performance Requirements: solo-gate-transaction

## Inputs and Scope

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。対象はdirective validation、report transport、state approval transaction、fallback continuationであり、U1のaudit scan性能を重複定義しない。

## Targets

| ID | Scenario | Target | Verification |
|---|---|---|---|
| U2-PERF-01 | carrier付きdirective validation | Grant Id/Route Id各1回以下のformat check、audit scan 0 | parser spy/counter |
| U2-PERF-02 | grant-backed report | state process invocation 1、stdout JSON parse 1、stderr content inspection 0 | subprocess adapter unit fixture |
| U2-PERF-03 | approval成功 | approval transaction 1、`GATE_APPROVED`/`STAGE_COMPLETED`各1件 | integration audit count |
| U2-PERF-04 | expected fallback | body/reviewer/sensor/learnings invocation増分0、state process invocation 1 | before/after counters |
| U2-PERF-05 | per-unit final gate | completed unit数にかかわらずbody/reviewer再実行0 | U=`1/3/10` fixture |
| U2-PERF-06 | fallback後のtargeted human continuation | additional stage body/reviewer/sensor/learnings 0、state process invocation 1 | end-to-end invocation counters |

## Resource Constraints

- carrier pairのための新process、cache、database、daemonを追加しない。
- reportはstate stdoutを一度だけparseし、stderr文字列検索でbranchしない。
- U1のspace-wide scan snapshotはreceipt owner pin専用とし、grant projectionへ再利用しない。owner lock取得後にowner auditを1回fresh readしてgrantを再検証する。性能counterはreceipt lookup passとowner validation passを別々に計測する。

## Traceability and Ownership

| Target | Upstream | Transaction rules | Blocking suite |
|---|---|---|---|
| U2-PERF-01 | FR-08, NFR-06–07 | TR-08–09 | directive schema unit |
| U2-PERF-02 | FR-10, FR-15, NFR-04 | TR-10–14c | report wire unit |
| U2-PERF-03 | FR-14, NFR-01 | TR-15, TR-19 | approval integration |
| U2-PERF-04 | FR-16–17, FR-23 | TR-16–20 | fallback integration |
| U2-PERF-05 | FR-22–23 | TR-06–07、Quality Ritual Rules | per-unit integration |
| U2-PERF-06 | FR-16, FR-18, FR-23 | TR-14d–e, TR-25 | targeted human continuation integration |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:00:10Z
- **Iteration:** 1
- **Scope decision:** none

strict wire、initial fallback不変条件、workspace→owner lock、per-unit count、team/human golden、traceabilityは概ね測定可能である。しかしactive cursor切替後のhuman continuationがowner intentへ相関されず、carrierless既存pathで非owner intentを操作し得る。lock適用範囲とcrash atomicityにも未確定事項がある。

### Findings

- BLOCKER: active cursor切替後のtyped fallbackからhuman continuationへのowner相関が失われる。owner intent/record targetをprompt reentryからhuman commitまで保持する機械契約とend-to-end fixtureが必要。
- MAJOR: 入力行列をlock取得前に分類し、workspace→owner hierarchyはfull carrier pairのgrant-backed branchだけに適用すると明記する必要がある。
- MAJOR: process crash時の複数append/state writeについて既存recovery semanticsへ合わせ、許容中間状態と再実行後の収束条件を明記する必要がある。
- MAJOR: cursor switch→await-approval→fresh HUMAN_TURN→carrierless reportまで測り、ownerだけが完了し非owner delta 0をblocking条件に追加する必要がある。
- RESOLVED: strict wire、fallback audit/state delta 0、workspace→owner lock、per-unit/concurrency/team golden、traceabilityは測定可能。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:05:28Z
- **Iteration:** 2
- **Scope decision:** none

target_intentを導入したhuman continuationでfresh HUMAN_TURNをowner intentへ安全に相関する方法と、target入力の検証境界が未定義である。targetを認可証拠にしない方針自体は正しい。

### Findings

- BLOCKER: active cursorを変更せずowner intentへexact human replyのHUMAN_TURNをmint／相関する既存互換の機械契約とfixtureが必要。
- BLOCKER: target_intentはtrust-boundary入力であり、path traversal、別space、未登録、alias、完了intentを排除するopaque identityとregistry canonical validationが必要。
- MAJOR: Data and Complianceへ新設target fieldの分類・露出・escape・保持方針が必要。
- RESOLVED: owner target forwarding、grant-only workspace lock、crash recovery parity、E2E non-owner delta 0は追加済み。
- CONFIRMED: targetを認可源にせずfresh human authorizationとtransaction targetを分離する原則は整合。
