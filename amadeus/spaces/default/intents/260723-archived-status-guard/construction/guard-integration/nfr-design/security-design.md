# Security Design — guard-integration

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`のfail-closed境界を共通guardへ集約する。

## Boundary components

- `RegistryPathBoundary`がworkspace-contained pathを発行し、`LifecyclePreflight`がlock/recoveryを所有し、`IntentStatusParser`がstrict 4値へ昇格する。
- `LifecycleLockAuthority`を含むこれらは上流Unitが所有するconsumed external componentsである。preflightは`withLock(callback)`と`recoverThenSnapshot(context)`でcontext、raw registry snapshot、snapshotVersionだけを渡す。
- callback内で`IntentSelectorResolver`が同じsnapshotからdirNameを一意解決し、`RegistryPathBoundary`がcontainedPathを証明し、`IntentStatusParser`がそのentryのunknown statusを4値へ昇格する。各typed errorは入口へ伝播し、本Unit側では再読込・再試行しない。
- `ArchivedIntentGuard`は検証済みintent identityとstatusだけを受け、`allowed`またはtyped `intent-archived`を返す。raw pathやunknown statusを受け取らない。
- 対象不在はresolverが`intent-not-found`として分離し、存在しない対象へarchived statusを付与しない。

## Output controls

- archived diagnosticはresolved dirName、status、operation、`intent unarchive <dirName>`だけを含む。
- fatal recovery diagnosticのjournal位置はworkspace-relative pathとし、absolute home path、journal本文、audit全文、environment/secretを出力しない。
- selector traversal、開始時symlink escape、ambiguous alias、解決後消失はfail closedにする。

## Actor boundary

- repository CLI同士はworkspace lockで直列化し、write直前にcanonical boundaryを再確認する。
- 同一OS userがcheck後にraw filesystem APIでdirectory entryを差し替えるactorへの完全isolationは保証せず、OS権限境界の責務とする。
- force、implicit unarchive、read-only selection bypassを追加しない。

## Utility delegation boundary

- `LifecycleDelegationAdapter`はutility側lock callback内でselectorをresolved dirNameへ変換し、callback終了とcontext失効を確認した後にだけstate subprocessを起動する。
- subprocessへ渡す入力はverbとresolved dirNameだけで、status snapshotやlock tokenを渡さない。state側は新しいlock contextでpath、存在、strict status、journal、human-presenceを再検証する。
- utility解決後の対象消失・差替え・status変化はstate側のtyped non-zero rejectionを正とし、utilityは再試行・暗黙補正・successへのdowngradeをしない。
- child stdout/stderrはbyte-for-byte各親streamへ転送し、numeric exit codeをそのまま返す。signal終了はnon-zeroとしてsignal identityを診断し、部分出力を隠さない。
