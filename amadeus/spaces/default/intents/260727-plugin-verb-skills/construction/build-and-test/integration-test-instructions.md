# Integration Test Instructions — 260727-plugin-verb-skills

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## 対象と実行

- t345-plugin-delegate-spawn(U1: 実 spawn 縦断)
- t353-plugin-install-verb(U2: 収束表の全行 — code-summary.md の swap/冪等/--force/symlink/拒否系)
- t351-runner-gen-plugin-runner(U3: compose 済みホスト模擬 fixture — 落ちる実証込み)
- t352-plugin-cli-runner-gen-wiring(U3: compose/drop 対称配線・loud 失敗)
- t354-amadeus-plugin-skill(U4: スキル契約+7面投影+マーカー不含)
- E2E: t341-plugin-conformance-journey(既存 — green 維持が受け入れ基準4)

`bun test tests/integration/t345-plugin-delegate-spawn.test.ts tests/integration/t353-plugin-install-verb.integration.test.ts tests/integration/t351-runner-gen-plugin-runner.integration.test.ts tests/integration/t352-plugin-cli-runner-gen-wiring.integration.test.ts tests/integration/t354-amadeus-plugin-skill.integration.test.ts tests/e2e/t341-plugin-conformance-journey.serial.test.ts`

## 完了条件

0 fail(本日実測 52 pass — build-test-results.md)。
