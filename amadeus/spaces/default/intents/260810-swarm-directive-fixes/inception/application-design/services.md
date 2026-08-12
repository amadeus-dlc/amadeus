# Services and Orchestration

入力: [`requirements.md`](../requirements-analysis/requirements.md)、CodeKB [`architecture.md`](../../../../codekb/amadeus/architecture.md)、[`component-inventory.md`](../../../../codekb/amadeus/component-inventory.md)。

## Service Boundary

新規network service、daemon、database、AWS resource、UI componentはない。Amadeusの短命 Bun CLI 内で、既存 orchestrator が同期的にpure projectionを呼ぶ modular-monolith構成を維持する。

## Orchestration Flow

1. `next` がcurrent intent/stageの正規化auditを読む。
2. C1がUnit outcome projectionを生成する。
3. per-unit selectorはprojectionを先に適用し、succeeded/cancelledを除外する。
4. non-per-unit consumerはC2でsucceeded populationだけをfan-outする。
5. C3がdisk presenceを分類しdirectiveをemitする。
6. reviewer付きstageではC4がrequired gapをreview開始前に拒否する。

## Lifecycle and Failure

- 処理は1 CLI invocation内で完結し、projection cacheを永続化しない。
- audit read失敗、相関不明、blocking Unit残存はfail-closed。
- Abort後の`next`は毎回auditから同じ`parked`を再構成でき、Stop hook変更を要しない。
- AWS platform / scaling / UX設計はN/A。外部通信と常駐resourceを追加しないためである。

## Compatibility

directive schemaはflat `consumes` / `consumes_absent`を維持する。正当なplaceholder round-tripと`report --result failed`の拒否契約を保存し、generated harness surfaceはbuildでのみ検証する。

