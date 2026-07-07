# Risk And Sequencing Rationale

## Upstream Trace

この rationale は `requirements`, `components`, `unit-of-work`, `unit-of-work-dependency`, `unit-of-work-story-map`, `team-practices` を根拠にする。Stage 2.7 の DAG は topology を定義し、この stage は economic sequencing を決める。

## Sequencing Heuristic

採用する heuristic は risk-first + decision-first である。Issue #610 の最大リスクは code move ではなく、root framework layout と package-owned setup layout の混在を暗黙のまま放置することである。そのため、最初に U1 Layout Decision Record を出す。

## Bolt Order Rationale

### Bolt 1 first

U1 は U2/U3/U4 の依存元であり、design record がないまま docs や validation plan を書くと、staged mixed layout の根拠が分散する。Bolt 1 は最小の source of truth を作り、後続 Bolt の変更方針を固定する。

### Bolt 2 second

U2、U3、U4 は U1 完了後に並行可能だが、すべて Issue #610 の closeability を支える documentation/planning work である。差分を分散させるより、Bolt 2 としてまとめて docs consistency と validation story を確認する。

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| ADR/design record の置き場所が未確定 | 中 | Bolt 1 開始時に repository の docs convention を確認する |
| docs 更新が広がりすぎる | 中 | Issue #610 の layout decision に関係する README/docs/contributing guide に限定する |
| validation command が重い | 低から中 | `dist:check` と `promote:self:check` を優先し、必要に応じて typecheck/lint/tests を実行する |
| `packages/setup` intent と重複する | 中 | この intent では setup 実装に触れず、boundary を docs/design に限定する |

## DAG Compliance

Bolt 1 は U1 を含む。Bolt 2 は U1 に依存する U2/U3/U4 を含む。したがって `unit-of-work-dependency` の DAG に違反しない。
