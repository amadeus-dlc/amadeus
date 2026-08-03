# Scalability Requirements — execution-observability-baseline

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Load Model と Capacity

`requirements.md` FR-01／FR-06、`business-logic-model.md` のroot-child-attempt treeとaudit projector、`business-rules.md` BR-EO-20〜31、`technology-stack.md` の短命Bun CLI／per-clone shardを前提とする。本Unitはworker poolや動的scale機構を実装せず、後続 [Issue #1919](https://github.com/amadeus-dlc/amadeus/issues/1919) の有界poolへ相関契約を提供する。

| ID | Dimension | Target | Verification |
|---|---|---|---|
| SC-EO-01 | operation tree | root 1件に対しchild／attemptが増えても保存・foldはO(E) | 1／100／1,000 event fixtureで全件を1回ずつ処理し、二重scanを禁止 |
| SC-EO-02 | projection memory | baseline projectionの追加memoryはevent総量に比例する全量複製を持たない | streaming reader／writer seamを使い、1,000 event fixtureで中間配列の全event複製0 |
| SC-EO-03 | clone concurrency | 最大4並行processでもcanonical ID衝突0、event欠落0 | 4 process／各100 IDのfixtureで400件一意、各eventがちょうど1回投影 |
| SC-EO-04 | distribution | 7 package harness面と影響する5 self-install面の100%で同じschema/version | package／promote drift guardとharness capability matrixで未判定0 |
| SC-EO-05 | replay | 同じidempotency keyのN回replayでentity数・event数の増分0 | N=10の重複start／finish／projection test |
| SC-EO-06 | native fact欠測 | capabilityの有無に関係なく各supported harnessが1つのtotal resultを返す | available／unavailable／legacy-unknown／incompleteの全variant conformance |

## Growth Strategy

- canonical auditはappend-only、runtime graphとbaseline manifestは再構築可能なprojectionとする。projectionごとに独自のtruth storeを増やさない。
- manifest schemaはversionedとし、未知fieldを理由に既存必須fieldを失わない。legacy recordは`legacy-unknown`へ正規化し、migration時に推測しない。
- per-clone audit shardと既存mkdir lockを維持する。新しいglobal daemon、database、distributed lockを導入しない。
- operation、attempt、projection receiptの処理はevent数に線形とし、childごとのaudit全再走査によるO(E×A)を禁止する。
- Unit 1は固定pool capを所有しない。active slot、queue、Unit attemptのcapacityは`bounded-unit-pool`のNFRで別途確定する。

## Saturation と Degradation

- OTel sinkの遅延・停止はcanonical pathのcapacityを消費させず、drop reasonを残してbest-effort退避する。
- state/runtime必須projectionが追随できない場合はbacklogを無制限に積まず、`pending-rebuild`を1 receiptとして記録してStartPermitを拒否する。
- malformed／過大なnative factはadapter境界のversioned schemaで拒否し、prompt本文をfallback payloadとして保存しない。
- synthetic 1,000-event検証はアルゴリズム退行を捕捉する決定的floorであり、実利用上限を1,000へ固定するものではない。
