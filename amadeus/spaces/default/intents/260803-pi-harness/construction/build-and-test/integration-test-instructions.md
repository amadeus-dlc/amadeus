# Integration / E2Eテスト手順 — Piハーネス正式対応

## 根拠と対象

全Unitの`code-generation-plan.md`と`code-summary.md`を横断し、extension→canonical core、child Pi RPC process、doctor dispatch、setup install/update、Pi Package parity、docs contract、M1〜M10 formal evidenceを検証する。外部providerなしで再生可能なfixtureを標準経路とする。

## Integration実行コマンド

```bash
bun test \
  tests/integration/t-pi-lifecycle-gate-adapter.integration.test.ts \
  tests/integration/t-pi-child-driver.integration.test.ts \
  tests/integration/t-pi-doctor-dispatch.integration.test.ts \
  tests/integration/t-pi-conformance-evidence.integration.test.ts \
  tests/integration/t-pi-docs-contract.test.ts \
  tests/integration/setup-install-flow.test.ts \
  tests/integration/t-plugin-projection-packaging.test.ts \
  tests/smoke/t-pi-dist-structure.test.ts
```

## E2Eと全CI実行コマンド

```bash
bun test tests/e2e/t-pi-candidate-conformance.serial.test.ts tests/e2e/setup-upgrade.test.ts
bun run test:ci
```

## 合格基準と環境

- integration、smoke、対象E2E、CI profileはfailure 0とする。
- child driverはfake Pi processを使い、timeout/cancel/reapを決定的に検証する。
- RPC入力では`HUMAN_TURN=0`と`GATE_APPROVED=0`、手動TUIだけ各1件以上を正式条件とする。
- `AMADEUS_PI_RPC_LIVE`未設定時のlive journeyはtyped skipであり、formal greenには数えない。
