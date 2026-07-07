# Team Allocation

## Upstream Trace

この allocation は `team-practices`, `unit-of-work`, `unit-of-work-dependency`, `requirements`, `components` に基づく。Team Formation は skip されているため、専任 mob は定義されていない。

## Allocation

| Bolt | Units | Owner | Support | Notes |
| --- | --- | --- | --- | --- |
| Bolt 1: Layout Decision Record | U1 | amadeus-developer-agent | amadeus-architect-agent | ADR/design record の作成。architecture consistency を重視する。 |
| Bolt 2: Documentation, Guard Validation, Follow-Up Preparation | U2, U3, U4 | amadeus-developer-agent | amadeus-quality-agent | docs 更新と validation plan/commands の確認。 |

## Branching And Review

この repository は短命ブランチから Pull Request 経由で `main` に取り込む運用である。今回の Construction は documentation/design-focused なので、Bolt ごとに小さい commit に分けるか、Issue #610 の単一 PR にまとめるかは最終差分量で判断する。

## Parallelism

U2/U3/U4 は DAG 上は並行可能だが、同じ docs/design surface を編集する可能性があるため Bolt 2 に bundle する。別 agent に分ける場合は file ownership を分ける必要がある。
