# Examples

このディレクトリは、Amadeus DLC の v2 互換ライフサイクルを実際の skill で駆動して生成した snapshot を置く。

題材は「EC サイト最小購入フロー」であり、Intent は `20260703-minimum-purchase-flow`（scope: `feature`）である。

## Snapshot 一覧

| Snapshot | 状態 |
|---|---|
| [01-ideation-completed](01-ideation-completed/) | Ideation の実行対象ステージが完了し、`phaseGates.ideation` を記録して `phase` が `inception` へ進んだ状態。 |
| [02-inception-completed](02-inception-completed/) | Inception の実行対象ステージ（要求、ストーリー、設計、Unit、Bolt 計画）が完了し、`phaseGates.inception` を記録して `phase` が `construction` へ進んだ状態。 |
| [03-construction-design-ready](03-construction-design-ready/) | walking skeleton の Bolt `B001` が active になり、対象 Unit の Functional Design が完了して Code Generation 前で止まっている状態。 |
| [04-construction-implementation-planned](04-construction-implementation-planned/) | 実装の直前。`B001` の各 Unit で Stage 3.5 が `active` になり、実装計画（`code-generation/plan.md`）まで確定して、コード生成前で止まっている状態。 |

各 snapshot は前の snapshot を入力に生成した累積の workspace である。

phase PR と Bolt PR は example の fiction として扱い、`https://github.com/example/ec-site/pull/...` を merge 済み evidence として記録している。

## 検証

```sh
npm run test:examples
```

`test:examples` は、各 snapshot の workspace 検証、Intent 検証、`skill-provenance.json` の md5 照合、生成計画の確認を行う。

## 再生成

```sh
npm run examples:generate:real
```

途中 step 以降だけを再生成する場合は `--from` を使う。

```sh
bun run dev-scripts/generate-amadeus-examples.ts --provider real --from 02-inception-completed
```

生成に使った source skill の md5 は [skill-provenance.json](skill-provenance.json) に記録する。
運用規則は [.agents/rules/amadeus-artifacts-and-examples.md](../.agents/rules/amadeus-artifacts-and-examples.md) に従う。
