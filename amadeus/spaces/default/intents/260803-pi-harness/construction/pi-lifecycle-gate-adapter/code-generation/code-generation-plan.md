# コード生成計画 — pi-lifecycle-gate-adapter

## トレーサビリティ

- 対象: SCN-003、SCN-004、SCN-007、FR-LIF-001〜006、FR-GAT-001〜004
- 根拠: `unit-of-work-story-map.md` の `pi-lifecycle-gate-adapter` implementation steps

## 実施計画

- [x] Step 1: Pi 0.83 public ExtensionEventのclosed parserとcaptured fixturesを固定する。
- [x] Step 2: session、tool、compaction lifecycleをcanonical audit/state contractへ接続する。
- [x] Step 3: interactive inputだけをpresence候補にし、duplicate deliveryをexact-onceで処理する。
- [x] Step 4: `agent_settled` continuationをoutbox化し、token-bound `agent_start`で観測済みにする。
- [x] Step 5: health latch、sealed journal、recoveryをfail-closedで実装する。
- [x] Step 6: session-start plugin auto-composeを既存core CLIへ委譲する。
- [x] Step 7: unit/integration testsを既存Bun test構成へ追加する。
