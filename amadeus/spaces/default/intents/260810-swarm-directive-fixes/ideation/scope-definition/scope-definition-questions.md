# Scope Definition 質問 — 260810-swarm-directive-fixes

上流入力（consumes 全数）: [`intent-statement.md`](../intent-capture/intent-statement.md)。feasibility / constraint-register は `self-feature` の stage 構成で SKIP のため存在しない。

Intent autonomy grant 承認: 2026-08-10T12:50:12Z。以下の回答は同 grant 下の full autonomy ladder で記録した。

## 確定済みスコープ境界

上流の `intent-statement.md`、[Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833)、[Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834)、および両 Issue のクロスレビューコメントが、次の能力をすべて in-scope と確定している。

1. 非 per-unit consumer の required input を全 Unit の実在パスへ展開する。
2. 同根7 stage（build-and-test / ci-pipeline / performance-validation / observability-setup / incident-response / deployment-pipeline / environment-provisioning）を一括して閉じる。
3. placeholder path と `consumes_absent` の明文契約衝突を実装前に裁定する。
4. reviewer read scope が per-unit 成果物を無音脱落させないようにする。
5. Retry / Skip / Abort の Unit 単位裁定を engine の batch selection と終端判断へ投影する。
6. swarm / non-swarm と autonomous Construction を同じ遷移契約で閉じ、3裁定すべてを遷移テストで証明する。

全項目が SETTLED であるため、最小価値スコープと Must / nice-to-have の境界質問は省略する。縮小は仕様変更であり、この stage の clarifying question では扱わない。

## Q1 — 能力間の依存

[Question]: 2つの能力群の依存関係をどう扱いますか？

- A. 共有 reverse-engineering で共通 seam を確定後、#2833 と #2834 を独立 Unit 候補として進める。
- B. #2833 の停止遷移を完了してから #2834 に着手する。
- C. #2834 の consume 投影を完了してから #2833 に着手する。

[Answer]: A. 共有 seam と競合面を reverse-engineering で確定した後は独立とする。ただし #2834 の Unit は pinned contract の裁定完了を開始条件とする。決定 `auto-decision-7bd007d91304e1617acdec73a58acb92`（full autonomy ladder）。

## Q2 — シーケンス選好

[Question]: 実装順序の優先原則をどうしますか？

- A. risk-first とし、P1 / S2-CRITICAL の #2833 を優先しながら、独立可能な Construction Bolt は swarm で並行する。
- B. dependency-first の完全直列とする。
- C. required input 可視化の #2834 を value-first で先行する。

[Answer]: A. risk-first + bounded parallel を採用する。優先順位は #2833 → #2834 だが、依存 DAG が許す範囲では同一 swarm batch で並行する。決定 `auto-decision-58e1d02b3c2a9d69a78081cb4d4cb6f3`（full autonomy ladder）。

## Q3 — 期限

[Question]: 能力ごとの固定期限はありますか？

- A. 固定日は置かず、severity と dependency を完了順序の根拠にする。
- B. 両能力に共通の固定日を置く。
- C. 能力ごとに異なる固定日を置く。

[Answer]: A. ユーザー指示と Issue コメントに固定日はない。P1 / S2-CRITICAL と P2 / S3-MAJOR の severity 順を urgency の正本とする。決定 `auto-decision-6d6e699b27c02dc94b6989f6a59e6c35`（full autonomy ladder）。

## 回答分析

- 曖昧性: intent 数は1で確定し、Unit / Bolt / PR 数とは分離している。
- 矛盾: #2834 の `consumes_absent` pinned contract と全 Unit 列挙要求は未裁定の仕様衝突として残す。scope から落とさず、reverse-engineering / requirements-analysis の hard stop とする。
- timeline: 固定日はないため、severity と dependency を損なう日程圧縮は行わない。
- 実装方式: Unit の正式境界と依存 DAG は units-generation、Bolt の経済的順序は delivery-planning で確定する。
