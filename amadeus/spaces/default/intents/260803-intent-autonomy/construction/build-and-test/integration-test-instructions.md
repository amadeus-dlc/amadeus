# Integration Test Instructions — intent-autonomy

## 入力とboundary

5 Unitの `code-generation-plan.md` と `code-summary.md` を入力に、U1→U2→U3→U4→U5の統合境界、canonical audit、cross-session replay、5 harness projection、terminal completionを検証する。実装依存は直列だが、完成後の独立したtest fileは並列実行できる。

## Focused commands

```sh
bun test --timeout 120000 \
  tests/integration/t426-loop-monitor-replay-index.integration.test.ts \
  tests/integration/t427-loop-monitor-five-harness-projection.integration.test.ts \
  tests/integration/t429-quality-repair-runtime.integration.test.ts \
  tests/integration/t430-quality-repair-five-harness-projection.integration.test.ts \
  tests/integration/t432-intent-autonomy-runtime.integration.test.ts \
  tests/integration/t433-intent-autonomy-five-harness-projection.integration.test.ts \
  tests/integration/t434-intent-completion-five-harness-projection.integration.test.ts \
  tests/integration/t434-intent-completion-live-seam.integration.test.ts
```

```sh
bun run test:ci
```

## Coverage expectations

- WAL / Replay Index、repair、causal clone merge、reconcile-firstを確認する。
- Quality RepairがU1 seamを再利用し、U3がU1 / U2を公開境界から統合することを確認する。
- U4 reviewがU3 projectionを消費し、workflow completionを巻き戻さないことを確認する。
- U5が同一revisionへ束縛された現行5 harnessのexactly-one receiptだけでterminal commitすることを確認する。
- package / registry / audit vocabularyが現行5 harnessで共通であり、harness固有Core分岐がないことを確認する。

## Failure handling

assertion failure、type error、projection mismatch、forged receipt受理はflaky扱いしない。cold timeoutだけを120秒timeoutで再実行し、最大2回の修正後も残るfailureは `build-test-results.md` に未解決として記録する。live attestation不足によるskipはpassへ昇格しない。
