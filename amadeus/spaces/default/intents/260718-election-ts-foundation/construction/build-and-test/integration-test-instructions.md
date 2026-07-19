# Integration Test Instructions — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニット code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 対象と実行

integration 層は実 FS/実 spawn(bolt-plan.md の層宣言):

```
bun test tests/integration/t235-election-store.integration.test.ts   # U2: atomic 2 assert 対・corrupt・amend 共存・後着レーン
bun test tests/integration/t236-election-loop.integration.test.ts    # U5: in-process 指令ループ・hold-resolved・agmsg 経路・改竄赤
bun test tests/integration/t240-election-transport.integration.test.ts # U4: fake send.sh 実 spawn・部分成功記録
bun test tests/integration/t242-election-skill-vocabulary.integration.test.ts # U6: 禁止語彙 sweep・vacuity guard・4節 pin
```

## e2e(--ci 外 — 明示実行)

```
bun test tests/e2e/t237-election-walking-skeleton.test.ts    # FR-0 実 CLI spawn 完走
bun test tests/e2e/t241-election-machine-executor.test.ts    # ADR-6 (i) 機械実行器(hold 人間停止込み)
```

## 合格基準

全 pass。CI 定型は `bash tests/run-tests.sh --ci`(smoke+unit+integration)+coverage(requirements.md NFR-2、team-practices.md の push 前 lcov)
