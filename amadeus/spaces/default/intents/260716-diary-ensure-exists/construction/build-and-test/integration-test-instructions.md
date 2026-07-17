# Integration Test Instructions — 260716-diary-ensure-exists

## 上流入力(consumes 全数)

`code-generation-plan.md`(検証計画)と `code-summary.md` AC-1c/AC-4c/AC-4d、requirements FR-4。

## 実行手順

- `bun test tests/integration/t135-invoke-swarm.test.ts`(8 tests — stdout 限定 parse 是正後の engine directive 面)
- `bash tests/run-tests.sh --smoke`(RESULT: PASS)
- フルスイート: `bash tests/run-tests.sh --ci`(2026-07-16T10:25Z 実測 RESULT: PASS / exit 0)

## dogfooding(AC-4d)

本 intent の record で `next` 実行時に diary が自動生成されることを実測 — construction/code-generation/memory.md(10:15Z)と construction/build-and-test/memory.md(10:38Z)の2件、いずれもテンプレート cmp byte 一致。
