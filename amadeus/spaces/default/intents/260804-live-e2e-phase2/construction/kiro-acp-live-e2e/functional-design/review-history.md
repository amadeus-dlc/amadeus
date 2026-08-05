# Functional Design Review History — kiro-acp-live-e2e

## Attempt 1

Artifact reuse decision `redo` により旧Review projectionを新しいreview cycleから分離した。正本の監査証跡は`ARTIFACT_REUSED` eventである。

### Iteration 1 — NOT-READY

- root PIDや通常process groupでは全子孫closureを証明できないため、pre-exec strong containment、非離脱membership、stable identity、boundary-wide termination、OS empty proofを要求した。

### Iteration 2 — NOT-READY

- boundary member emptyとPOSIX child reapは別証明であり、`ProcessClosureReceipt`へ`BoundaryEmptyProof`と`DirectChildReapReceipt`の両方を要求した。
- empty boundary＋未reap zombieのfailure injectionを追加した。

### Resolution before redo

Iteration 2のBLOCKERはrequired artifactへ反映済みだったが、reviewer iteration上限後だったためvalidated READYが存在しなかった。最終stage gateのcompletion verificationで検出し、新しいreview cycleへ移した。
