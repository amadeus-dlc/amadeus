# Reliability Requirements — mirror-distribution-docs

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Determinism and Drift

| ID | Requirement | Verification |
|---|---|---|
| REL-DD-01 | 同一source／manifestから2回生成したtreeのpath集合とbytesが完全一致 | double-generation test |
| REL-DD-02 | tool／skill payloadはraw bytes一致、registration wrapperはsurface golden一致 | digest matrix |
| REL-DD-03 | missing／extra／content／semantic findingを全件収集し、1件でもcheck failure | multi-drift fixture |
| REL-DD-04 | manifest管理fileは同一親directory内のfile renameでatomic replaceし、lock準拠readerには更新前または更新後の完全snapshotだけを返す | concurrent reader＋commit-point kill injection |
| REL-DD-05 | check modeはread-onlyでsource／generated outputを変更しない | before／after tree digest |
| REL-DD-06 | JA/ENが同じ誤値でもruntime contractとの差分としてfailure | dual-locale mutation |

## Failure and Recovery

- transaction対象はprojection manifestが列挙するfileだけとし、`.claude/`、`.codex/`、`.agents/`等のroot全体やmanifest管理外fileをrename／削除しない。
- generate／recoverはrepository-local transaction lockをexclusive取得し、check／package validation／promote validationは同じlockをshared取得する。lock準拠readerはcommit中に走らないため、更新前または更新後の完全snapshotだけを読む。lock取得timeoutはfailであり、lockを迂回して読まない。
- generatorは各対象fileと同じ親directoryにnew fileを完成してfsyncし、既存bytesをjournal backupへ保持してからfile単位のatomic renameで置換し、親directoryをfsyncする。新規fileの旧状態はabsent marker、削除対象の新状態もabsent markerとしてjournalへ記録する。
- 複数file更新はtransaction journalへ固定順（surface ID→artifact kind→relative path）と各fileのold／new digestを先に記録してから順次commitする。途中failureではrelease successを返さず、journalとbackupを保持する。
- `check`は未完journalを検出して`recovery-required`でfailするだけで、生成対象、journal、backupを変更しない。rollback ownerは明示command `bun scripts/distribution-transaction.ts recover`と次回のmutating `generate` preflightだけである。
- recoverはexclusive lock下でcommit済みfileを逆順にold bytes／absentへ戻し、全old digest検証後にjournalをclearedとしてfsyncする。rollback失敗時はjournalとbackupを保持してfail closedとし、生成を継続しない。
- generated artifactだけの修正はdriftとして拒否し、core／manifest／generator／docs sourceの修正を要求する。
- dist／self-install／docs failureはreleaseを停止するが、AI-DLC runtime workflow stateを変更しない。
- findingはsurface、path、kind、expected／actual digestまたはsemantic fieldを持つ。

## Observability

CI summaryはsurface別pass／fail、missing／extra／mismatch count、durationを表示する。secretを含み得るfile contentは出力せずdigestとrelative pathだけを記録する。1 run内のfinding順はsurface ID→relative path→kindで固定する。

## Acceptance

1. 各fileのbackup後、rename後、fsync後でkillし、同時shared-readerが更新途中を観測しないこと、kill後のcheckがwrite 0件で`recovery-required`になることを確認する。
2. 任意commit pointでkill／disk fullを注入し、明示recover後のmanifest管理file集合digestが更新前へ完全一致し、管理外file digestが不変であることを確認する。malformed manifest／docs marker不正ではcommitを開始しない。
3. runtime Mirror state／GitHub Issue mutationは全distribution testで0件。
