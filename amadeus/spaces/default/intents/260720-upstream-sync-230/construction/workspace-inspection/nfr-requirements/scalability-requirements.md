# Scalability Requirements — workspace-inspection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、workspace sizeに対するdepth-1有界走査と6 harness projectionの決定性を対象とする。

## Capacity境界

| ID | Dimension | Target | Evidence |
|---|---|---|---|
| SCALE-U06-01 | discovery depth | rootと直下candidateまで。depth>1 container discoveryなし。 | depth-2 fixtureでhit 0。 |
| SCALE-U06-02 | nested attribution | 単一hitだけ`nestedRoot`、複数hitは全sorted candidatesで自動選択なし。 | 1/2+ hit対照fixture。 |
| SCALE-U06-03 | submodule display | sorted先頭5件と残数。 | 6+ entry fixture。 |
| SCALE-U06-04 | consumers | birth/detect/doctor/auditの4面が同一snapshotを使用。 | consumer別rescan 0。 |
| SCALE-U06-05 | distribution | authored sourceから現行6 harnessへ決定的projection、4 self-install境界不変。 | dist/promote checks。 |

1 depth、5表示、4 consumer、6/4配布は既決contract/inventoryであり、新しいcapacity thresholdではない。

## Scaling strategy

- root signalがあればfallbackを打ち切り、既存workspaceのscan量を増やさない。
- candidate/safe submodule pathをcanonical sortし、filesystem enumeration orderへ依存しない。
- consumerごとのscannerやpersistent indexを作らず、invocation-local immutable snapshotを共有する。
- worker pool、database index、network crawler、filesystem watcherを追加しない。

## Validation

empty/top-level/single/multiple/depth2/excluded/symlink/permissionと、submodule 0/1/6+/malformed/unsafeを対照fixture化する。大きなcandidate集合でもdepthとprojection scopeを拡張しない。

## トレーサビリティ

SCALE-U06-01〜05は`business-rules.md`のBR-U06-02〜19、`business-logic-model.md`のpipeline/projection、`requirements.md`のNFR-1/4、`technology-stack.md`の6/4配布構成に対応する。
