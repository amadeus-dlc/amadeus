# Unit Test Instructions — Codex Duration Bounds

## 対象と上流

各Unitの `code-generation-plan.md` と `code-summary.md` に記録されたshared core契約を、fake clock、決定的ID、temp workspace、fake writerで隔離して検証する。Comprehensive戦略としてhappy path、error path、境界、再開、改ざん拒否を対象にする。

## 対象test

```bash
bun test \
  tests/unit/t406-execution-observability-contract.test.ts \
  tests/unit/t407-execution-lifecycle-coordinator.test.ts \
  tests/unit/t408-harness-execution-capability.test.ts \
  tests/integration/t409-baseline-manifest.test.ts \
  tests/integration/t410-execution-required-projection.test.ts \
  tests/unit/t413-convergence-policy.test.ts \
  tests/unit/t245-reviewer-protocol-seams.test.ts \
  tests/unit/t425-unit-pool.test.ts
```

## 必須境界

- #1602: root／child／attempt identity、monotonic優先duration、欠測・逆行時のtotal result、baseline manifest再構築、7 harness capability正規化。
- #1998: Stop cap、durable execution budget、4 fact一致時だけのretry、unknown／effect possible／認可・設定・validation failureのfail-closed。
- #1999: 質問上限4／8／12、review cycle上限、質問・指摘の集約、追加turnをquota消化目的で生成しない契約。
- #1919: cap 1／2／4、Unit 0／1／4／8、FIFO、DAG、retry、terminal outcome、atomic audit append、機密field非出力。

## 合格基準

全test exit 0、実時間sleep 0、network I/O 0、flake rerun 0とする。coverage率だけでなく、各Issueの反証可能な境界がtest名とassertionから追跡できることを必須とする。
