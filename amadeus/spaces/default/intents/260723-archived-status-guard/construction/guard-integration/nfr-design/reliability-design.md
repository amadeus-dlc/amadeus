# Reliability Design — guard-integration

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`の副作用不変性と短絡順序を設計する。

## Guard sequence

1. workspace lockを取得し、未完了journalをforward recoveryする。
2. resolver/path boundaryで対象identityを確定し、strict statusを読む。
3. archivedなら共通typed rejectionを生成する。
4. adapterがselect/unparkのnon-zero CLI error、またはnextの`kind:error`へ変換して即returnする。
5. allowed statusだけが既存mutation/stage-resolution callbackへ進む。

## Baselines

- journalなしfixtureはcall-entryをbaselineとし、rejection-returnまでregistry、cursor、state、marker、audit bytesを完全一致させる。
- journalありfixtureはcall-entry→post-recoveryの期待差分を検証し、post-recovery snapshotをguard baselineとする。そこからrejection-returnまで対象bytesを完全一致させる。
- recovery不能時はguardへ進まず、workspace-relative journal pathを含むtyped fatal errorで停止する。

## Verification matrix

- selector: intent name、record-dir、internal cursor writer、対象不在、symlink/traversal、解決後消失。
- next: archived stale cursor、recovery後archived、allowed status、run-stage/ask/printへのfall-through 0。
- unpark: archived+parked、archived+unparked、allowed parked。
- 各testは目的branch coverageとbytes不変を併せて確認し、同じexit codeの別parse errorを合格にしない。

## Delegation failure propagation

- utility resolver lock中はsubprocessを起動しない。lock解放後に`LifecycleDelegationAdapter`がstate commandを一度だけ起動し、state側が新しいpreflight/recoveryから判断する。
- spawn失敗、child non-zero、signal終了、stdout write失敗、stderr write失敗をloud failureとし、utilityはchildの成功を捏造しない。
- spawn前失敗では永続状態不変。spawn後はstate commandが唯一のmutation ownerであり、utilityはchild終了後にregistry、cursor、auditを追加変更しない。
- TOCTOU fixtureはutility resolve後・state lock取得前に対象削除、status変更、path差替えを注入し、state rejectionと永続面の期待差分を確認する。

## Local observability

- 常駐monitoring、paging、tracing、service SLAはN/A。
- archived rejectionは実行可能な復旧commandを示し、corruptionだけを手動調査必須のfatal diagnosticにする。
