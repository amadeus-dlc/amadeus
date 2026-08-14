# Unit Test Instructions(intent 260814-fmc-macos-provider)

戦略: Comprehensive(要件・リスク・NFR 駆動)。対象は code-generation-plan.md の Step 2〜6 が生成・強化した unit テスト。

## 実行

- 患部 unit 一式: `bun test tests/unit/t-formal-verif-tlc-spawn-planner.test.ts tests/unit/t-formal-verif-tlc-toolchain.test.ts tests/unit/t-formal-verif-tlc-public-surface.test.ts tests/unit/t401-directive-and-toolchain-rejections.test.ts`
- フル: `bash tests/run-tests.sh --ci`

## 観点(要件対応)

- FR-1: auto+darwin の Docker フォールバック(planner 種別・argv・receipt まで assert)
- FR-2: 両系統失敗 → ENVIRONMENT_UNAVAILABLE + 両理由包含 + exit 2
- FR-3: 明示 provider 非フォールバック(inspect 呼び出し系列で assert)+ PROVIDER_PLATFORM 不変
- FR-4: 事前失敗 receipt が実選択 planner に追随(auto+darwin で docker 解決後は docker plan)
- FR-5: major 26 受理 / 25・27 拒否(FIXED_JDK_RUN_PROFILE・manifest・実行時述語)
- FR-7: auto 選択の planner 種別マトリクス(5組)
