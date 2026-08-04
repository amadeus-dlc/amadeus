# Functional Design Review History — kimi-print-live-e2e

## Attempt 1

Artifact reuse decision `redo` により、旧required artifactのReview projectionを再生成対象から分離した。正本の監査証跡は`ARTIFACT_REUSED` eventであり、本書は再生成時に同じ欠陥を戻さないための要約である。

### Iteration 1 — NOT-READY

- cleanup codeを上流の`cleanup-barrier-failed`へ統一する。
- journey timeout、Bun test timeout、retryable reasonの決定規則を固定する。
- preflight SKIP時のaggregate非生成とattempt cardinalityを整合させる。
- exact opt-in keyを`AMADEUS_KIMI_PRINT_LIVE`として明示する。

### Iteration 2 — NOT-READY

- executionとcleanupの二重失敗でも、外側のcanonical errorは常に`cleanup-barrier-failed`とし、元execution outcomeはそのerror payload内に保持する。
- gate/preflight後、scratch前にrun-wide exclusive leaseを取得し、retry間も保持し、ledger処理を含む全終了経路のfinallyで解放する。競合は待機せず閉じたbusy結果として拒否する。

### Non-blocking follow-up

- bounded evidenceの上限単位とsanitize順序をUTF-8 byte基準へ統一する。
