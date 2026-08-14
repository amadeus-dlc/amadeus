# Integration Test Instructions(intent 260814-fmc-macos-provider)

戦略: Comprehensive。実 TLC / Docker は起動しない(fake port / タイミングシーム — code-summary.md の検証方針どおり)。

## 実行

`bun test tests/integration/t-formal-verif-run-model-check.integration.test.ts tests/integration/t-formal-verif-tlc-runtime.integration.test.ts tests/integration/t-formal-verif-node-toolchain-ports.integration.test.ts tests/integration/t-formal-verif-planned-tlc-runtime.integration.test.ts tests/integration/t-formal-verif-tlc-cache.integration.test.ts`

## 観点

- run-model-check の end-to-end(fake port): ENVIRONMENT_UNAVAILABLE の errorDetail 文言(major 26 契約の新文言)、env-receipt 構造、exit code
- toolchain 経路の JDK 検証(#verifyJavaVersion)が 26.0.2 系を受理すること
- 実環境スモーク(任意・CI 外): `AMADEUS_RUN_REAL_TLC=1` + darwin + JAVA_HOME で t-formal-verif-run-model-check-real
