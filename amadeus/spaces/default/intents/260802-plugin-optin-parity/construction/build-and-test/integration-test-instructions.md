# Integration Test Instructions — plugin-optin-parity

`code-generation-plan.md` のFR-1〜FR-6と `code-summary.md` の原子性・横断E2E実績を、実filesystem/process境界で再検証する。

## Integration実行

```bash
bun test --timeout 120000 \
  tests/integration/t257-amadeus-config.integration.test.ts \
  tests/integration/t320-activation-spec-hash.integration.test.ts \
  tests/integration/t321-activation-engine-seams.integration.test.ts \
  tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts \
  tests/integration/t327-hook-wiring-xor-closure.integration.test.ts \
  tests/integration/t340-plugin-drop-fs-restore.integration.test.ts \
  tests/integration/t353-plugin-install-verb.integration.test.ts \
  tests/integration/t381-advisory-checkpoints-latch.integration.test.ts \
  tests/integration/t382-activation-real-layout-spec-root.integration.test.ts \
  tests/integration/t413-plugin-optin-selection.integration.test.ts \
  tests/integration/t413-plugin-optin-reconciliation.integration.test.ts
```

## E2Eと全回帰

```bash
bun test --timeout 120000 \
  tests/e2e/t341-plugin-conformance-journey.serial.test.ts \
  tests/e2e/t413-plugin-optin-cross-harness.serial.test.ts
bun run test:ci
```

7 face / 6 host、current host限定、非current host byte不変、未選択zero-impact、OpenCode `session.created`、3 checkpointのmain/`--single`同値、TLC非自動実行を検証する。

## 合格基準とデータ管理

- install/drop各failure injectionでconfig、supply、staging、compositionが契約どおりrollbackまたはplugin単位commitされる。
- 複数pluginの部分成功後、成功済みpluginを再適用せず失敗pluginだけをretryする。
- temporary projectは各testが専有し、終了時にcleanupする。利用者管理stagingとproject supplyをfixtureで区別する。
- 全CIはfailed file 0、failed assertion 0。live SDK/substrateの正規skipは件数と理由を結果へ記録する。
