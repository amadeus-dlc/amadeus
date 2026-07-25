# Performance Design — mirror-state-provenance

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Hot Path

lock内でstateをexactly 1回readし、sentinel位置を1 passで探索する。Mirror block外はsubstring参照で保持し、tokenizerはMirror JSONだけをO(N) parseする。reducerはreceipt mapのevent key lookupをO(1) averageで行う。

| Path | Budget |
|---|---:|
| 2 MiB／1,000 receipt／1,000 warning parse | p95 ≤ 50 ms |
| changing transition（lock待ち除外） | p95 ≤ 100 ms |
| no-op | write／fsync／rename／revision増加 0 |
| marker 10,000 operations | p95 ≤ 1 ms／operation |

## I/O Sequence

business transition commitはsame-directory temp write→file fsync→rename→parent directory fsyncを1回実行する。audit append成功後のoutbox clearは別のrevision不変maintenance commitであり、同じAPI callのrename budgetは最大2回である。既存outboxを検出したcallはdrain＋clearだけで`recovered`を返し、新business transitionを同じcallで続行しないため最大1回である。CAS conflict、invalid、repair拒否はtemp作成前に終了する。

PERF-SP-02の100 ms区間はbusiness commit pointまでとし、end-to-end transitionはaudit append＋outbox clearを含めp95 ≤ 150 msとする。audit failure時はcommit済みなので`committed-audit-pending`返却までを測り、clearを待たない。

## Benchmark

GitHub Actions `ubuntu-24.04` X64、pin済みBun、local temp filesystem、warm-up 100＋1,000測定、独立3 job p95中央値を使う。最大／最小比2.0超、image不一致、欠損はinconclusive failureとする。

## Verification

PERF-SP-01〜06をcall-count spy、fixed fixture、nearest-rank benchmarkで検証する。PERF-SP-06はaudit append成功fixtureでbusiness commit＋outbox clearのrename exactly 2、p95 ≤ 150 msを確認する。既存outbox recoveryはrename exactly 1で`recovered`を返し新transition 0件、audit failureはclear rename 0で`committed-audit-pending`を返す。production cache、retry loop、test modeは追加しない。

## Review Iteration 2 Remediation

- `relink`／`abandon`のrequired／null matrix、action literal、provenance digest対象bytes、完全golden wireを追加した。
- PERF-SP-06へ成功、既存outbox recovery、audit failureのcall-countとp95検証を追加した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T08:49:01Z
- **Iteration:** 1
- **Scope decision:** none

transactional outboxの所有境界、idempotent audit contract、repair plan codecが不足し、rename budget、capacity slot、上流component mappingにも残件がある。

### Findings

- [Blocker] C3/S4/C6間でoutbox drain、state lock、audit append、clear ownerとlock順が矛盾。
- [Blocker] idempotent audit appendの検索範囲、same ID conflict、durability point、crash duplicate判定が未定義。
- [Blocker] repair planのschema、field順、null、文字列／数値canonicalizationが未定義。
- [Major] business commitとoutbox clearでrename回数／性能計測区間が上流と不整合。
- [Major] capacity予約slotがoperation別keyでは二度目を保存できない。
- [Major] S0〜S7と上流C0/C3/C4/C6のmapping、公開API、所有dataが未定義。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T08:52:42Z
- **Iteration:** 2
- **Scope decision:** none

outbox ownership、audit append、rename budget、capacity singleton、C3/C4 mappingは解消。repair plan variantとPERF-SP-06検証が残る。

### Findings

- [Blocker] relink/abandon別の必須値/null matrix、action語彙、provenanceDigest対象bytes、完全wire例がない。
- [Major] performance-design VerificationがPERF-SP-06を除外している。固定fixture、call count、failure caseが必要。
