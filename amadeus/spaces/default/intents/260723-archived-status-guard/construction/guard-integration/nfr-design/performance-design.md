# Performance Design — guard-integration

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を、既存preflight後の定数回guard判定へ写像する。

## Runtime path

- selector、next、unparkは`LifecyclePreflight`でrecoveryを完了し、検証済みregistry snapshotから対象statusを一度読む。
- archived判定は判別union生成と既存public shapeへのadapter変換だけを行い、追加の全registry scan、audit scan、network I/Oを行わない。
- `next`はstage graph resolution前に即returnし、selector/unparkはcursor・marker mutation前に終了する。

## Benchmark design

- capacity fixtureはregistry 10,000 entries、intent dirs 10,000、audit 100,000 rows、selector 128 UTF-8 bytes、state 64 KiB、marker 1 KiB、target末尾とする。
- allowed/archivedを同一seedからpairwise実行し、各差分を`max(0, archived_ms - allowed_ms)`として100個のnearest-rank p95を算出する。目標は各入口100 ms以下。
- peak RSSもallowed/archivedの独立process 100組を交互実行し、差分p95 16 MiB以下とする。

## Enforcement

- 各pair前にregistry、cursor、state、marker、audit、journalをseed snapshotへ復元し、SHA-256を確認する。
- correctness 100%とrunner provenanceが揃わなければ性能合否を出さない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T10:17:56Z
- **Iteration:** 1
- **Scope decision:** none

ガード本体の性能・信頼性・並行実行設計は具体的だが、utility→state委譲のNFR設計と必須共有ライフサイクル機構の外部依存が欠落している。

### Findings

- MAJOR NFRD-001 — LifecycleDelegationAdapter、lock境界、TOCTOU再検証、child exit/signal/stdout/stderr透過、失敗時不変条件を定義する。
- MAJOR NFRD-002 — LifecycleLockAuthority、IntentStatusParser、validated registry snapshot providerをconsumed external componentsとして定義する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T10:20:30Z
- **Iteration:** 2
- **Scope decision:** none

NFRD-001は解消されたが、LifecyclePreflightの出力契約とresolver/path/parserの下流依存順序に循環が残る。

### Findings

- MAJOR NFRD-002 — preflight outputをcontext+registrySnapshot+snapshotVersionに限定し、callback内でresolver→path boundary→status parserがvalidated intentを構築する一方向契約へ修正する。
- RESOLVED NFRD-001 — LifecycleDelegationAdapterと委譲失敗契約を確定。
