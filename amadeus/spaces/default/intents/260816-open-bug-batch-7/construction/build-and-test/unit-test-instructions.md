# Unit Test Instructions — 260816-open-bug-batch-7

depth = Minimal / Test Strategy = Comprehensive(self-fix 既定)。テストは各 unit の TDD で実装済み(build-and-test は検証・拡張であり新規作成しない)。

## 対象と実行

- nsd-provenance: `bun test tests/integration/no-silent-drop-gate.test.ts tests/integration/t413* tests/integration/t427*` — events-only 化の negative/positive、census 212 系
- pi-distribution: `bun test tests/integration/t2363-pi-self-install-delivery.integration.test.ts tests/unit/t209* tests/unit/t-plugin-projection*` ほかピン更新 5 面
- sensor-docs-sync: `bun test tests/integration/t3028-sensors-docs-sync.integration.test.ts` — name→glob 値照合 + 06 containment

## フルスイート

`bash tests/run-tests.sh --ci` はリモート CI(各 PR の Tests / ci-success 集約)を正とする(remote-first ノルム)。ローカルは対象テスト + typecheck / lint まで。
