# Unit Test Instructions — intent 260815-per-unit-outcome

> test-strategy Comprehensive / depth Minimal。要件・リスク・裁定拘束駆動。

## 対象と実行

- 患部直撃: `bun test tests/unit/t533-per-unit-consume-fanout.test.ts`(8 — edge drift 含む)
- 台帳ピン: `bun test tests/unit/t28-audit-event-sync.test.ts tests/unit/t81.test.ts`(イベント件数 93 ピン)
- 射程: FR-2(落ちる実証)/ FR-3(batch join)/ 留保1(冪等)/ 留保4(pool 優先 de-dup)は integration 層(下記)で担保

## カバレッジ

- blocking は CI の Project/Patch Coverage Gate を正とする(remote-first)。新規テストは既存 in-process import 面のみ(母集団膨張なし)
