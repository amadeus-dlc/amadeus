# Integration Test Instructions — 260814-priority-bug-batch

> Strategy Comprehensive / Depth Minimal。

## 実行

```bash
bun test tests/integration/t2851-doctor-self-install-freshness.serial.test.ts   # FR-3(clean で実行・dirty で理由付き skip)
bun test tests/integration/t-pi-child-driver.integration.test.ts                # FR-4(settle 後遅延 close = succeeded、真のハング = timed-out)
bun test tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts  # FR-1 の既存境界
bun test tests/integration/t224-upstream-v2-migration-cli.test.ts               # FR-2 の既存境界(注: 別件 #3079 のローカル timeout あり)
```

- 境界: subprocess spawn(bun ↔ git / promote-self / pi guardian)とテスト fixture 隔離
- 期待: 全 green(#3079 の symlink ケースはローカル既知赤・スコープ外、CI では非再現)
