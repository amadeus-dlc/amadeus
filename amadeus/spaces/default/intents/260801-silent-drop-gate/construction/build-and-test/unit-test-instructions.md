# Unit Test Instructions — silent-drop-gate

## 上流成果物と対象

本書は各Unitの `code-generation-plan.md` と `code-summary.md` を入力とし、Comprehensive test strategyに従う。pure domain、typed result、parser、ratchet、証跡validator、failure mappingをユニット境界で検証する。

| Unit | 主な契約 |
|---|---|
| mirror-persistence-propagation | pre-commit／durability-unknown／outbox-pending、retry 0、audit at-most-once |
| static-gate-engine | NSD001〜003、semantic fail-closed、shrink-only ledger |
| text-mutation-loud-failure | validated state、not-found、postcondition、非対象byte不変 |
| repository-adoption | full SHA argv、23 receipt closure、timing／capacity validator |

## 実行方法

```bash
bun test --timeout 120000 \
  tests/unit/t194-recompose.test.ts \
  tests/unit/t279-amadeus-mirror-executor.test.ts \
  tests/unit/t400-lib-record-path-and-field-helpers.test.ts \
  tests/unit/t77-bolt-worktree-flags.test.ts \
  tests/unit/t82-hold-merge-invariant.test.ts \
  tests/unit/t-run-tests-perf-tier.test.ts
```

framework設定は既存Bun testを使用し、外部serviceや共有mutable dataを使わない。fixtureはtestごとの一時directoryまたはin-memory valueとし、test終了時にcleanupする。

## 合格条件とcoverage

- 全test pass、fail 0、timeout 0、flaky retry 0
- happy pathに加えて、invalid／missing／duplicate／unknown／pre-commit／post-commitの境界を含む
- write、audit、success、retry、resync、transition call countを要求値どおりassertする
- coverageは個別test数ではなく、後段のaggregate coverage gateでuncovered 0、期限切れallowlist 0、project baseline以上を要求する
- 各failureで型、bytes、call count、公開JSON／exit contractを同時に確認し、単なる非0終了だけを証拠にしない
