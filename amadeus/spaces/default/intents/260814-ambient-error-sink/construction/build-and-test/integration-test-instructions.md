# Integration Test Instructions — 260814-ambient-error-sink

> 上流: `code-summary.md` の検証表に基づく。

- t544(新規)は t258 直系の idiom: `resetOtelPerProject()` + argv 中和 + `_resetCloneIdForTests()` + ambient fixture の shard 空 assert(F2 仮説が残っても偽緑にならない形)
- marker 段(Test D)は t481 idiom: marker fixture(amadeus/ + .claude/tools/)+ realpathSync + `process.chdir` save/restore(afterEach 配置)
- write⇔read 境界: 拒否 directive の emit と監査シャード不生成を同一実行で両面検証
