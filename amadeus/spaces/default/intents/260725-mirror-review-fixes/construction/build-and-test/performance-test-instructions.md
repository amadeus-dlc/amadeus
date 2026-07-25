# Performanceテスト手順

## 適用範囲

本bugfixは新しい性能目標を導入しない。[code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md) と [code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md) が維持する既存のMirror distribution/release gateを回帰検証する。FR-4ではcoverage sourceの重複除去を検証するが、coverage率の特定値は合否条件にしない。

## 実行コマンド

```bash
bun test tests/e2e/t293-mirror-distribution-release-gate.test.ts
bun run distribution:check
bun run distribution:benchmark
```

CI上の3 replica集約は既存workflowの`distribution-benchmark-aggregate`が担当する。ローカル測定値をCIの固定証拠に代用しない。

## 成功条件

- release gateが契約findingを1件でも検出した場合に失敗し、正本・dist・self・docsが同期した状態で成功する。
- record identity解決がsourceと4 self layoutで同じ結果になる。
- benchmarkは有効なJSON証拠を生成し、既存のp95/RSS/分散budgetを変更しない。
