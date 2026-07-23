# Performance Design — status-registry

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`を入力として、strict registry 処理を固定数のO(n)走査に保つ。

## Runtime path

- pass 1はlegacy JSON decode、全status検査、target count/raw status保持を行う。
- pass 2はraw token locatorで一意なtarget objectのstatus spanを得て、intended bytesを生成する。
- pass 3はintended bytesのstrict parse、target外slice一致、全status 4値を検証する。commit後read-backは永続化検証の別I/O passとする。
- 各passはO(n)であり、entryごとのnested scanは行わない。通常parse/stringifyによる全file再生成はしない。
- cache、worker pool、connection pool、非同期queueは追加しない。短命CLIで再利用利益がなく、状態鮮度とbyte-preservationを損なうためである。

## Benchmark component

- 10,000-entry fixtureをwarm cache化し、10 warm-up後に100 independent child processを実行する。
- latencyはstrict read p95 100 ms、migration candidate生成 p95 250 ms。RSSはnoop childとの差分を100組測り、nearest-rank p95 64 MiB以下とする。
- fixture SHA-256、Git SHA、Bun version、runner image、CPU model、全correctness結果を既存CI artifactへ記録する。

## Budget enforcement

- correctness、environment provenance、100標本のいずれかが欠けた測定は合否に使用しない。
- 1k/2k/5k/10kのgrowth testで、10倍入力の時間が25倍を超えたらO(n²) regressionとして失敗させる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:23:40Z
- **Iteration:** 1
- **Scope decision:** none

NFR Requirementsの数値目標は主要componentへ概ね割り当てられ、parser、migration planner、atomic writer、benchmark、drift guardの分離も妥当である。しかし、設計が主張する単一走査と実際のmigration protocolが一致せず、atomic durability、read-back mismatch後の収束、lock capability依存、path containmentの所有境界にも実装上の空白が残る。

### Findings

- MAJOR — migrationのpass数と各pass責務を明示し、単一走査主張を撤回する。
- MAJOR — atomic writerのfile/directory fsync順序とfailure contractを定義する。
- MAJOR — read-back mismatch後の自動収束条件をstrict parse可能なarchived状態へ限定する。
- MAJOR — LockedLifecycleContext token authorityのownerと依存方向を定義する。
- MAJOR — canonical path containmentの単一ownerを定義する。
- MINOR — failure injection後のtemp cleanup/reuse方針を定義する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:26:48Z
- **Iteration:** 2
- **Scope decision:** none

前回6指摘は解消された。migrationは固定数のO(n) passへ分解され、AtomicRegistryPortにはtemp file・target file・parent directoryのdurability順序とfailure contractが定義された。read-back mismatch後の再実行可能条件、共有LifecycleLockAuthorityによる非循環依存、RegistryPathBoundaryの単一ownership、unique temp suffixとcleanup方針も明確である。

### Findings

- RESOLVED — 固定O(n) passへ分解。
- RESOLVED — AtomicRegistryPort durability順序を確定。
- RESOLVED — read-back mismatch再実行条件を限定。
- RESOLVED — LifecycleLockAuthorityで非循環化。
- RESOLVED — RegistryPathBoundaryを単一owner化。
- RESOLVED — unique temp suffixとcleanup方針を確定。
