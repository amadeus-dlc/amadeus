# Unit Test Instructions

入力は `code-generation-plan.md` と `code-summary.md`。Comprehensive strategy と FR-1〜FR-8 に基づき、状態遷移、attestation、digest、sensor resolver の正負両経路を確認する。

## 実行

```bash
bun test --timeout 120000 \
  tests/unit/t511-blocking-sensor-severity.test.ts \
  tests/unit/t534-pr-convergence-report-attestation.test.ts \
  tests/unit/t-sensor-fire-seam.test.ts
```

## 成功条件とデータ

- 全 assertion が pass し、fail/timeout が0件。
- inline audit JSONL、temporary project、stub sensor scripts を各 test が所有し、共有 mutable state を残さない。
- happy path に加えて never-fired、failed、stale digest、tamper、artifact move、CLI dispatch の edge case を含む。
