# Security Requirements — tla-invalid-timestamp-skeleton

## Threat boundary

`business-logic-model.md` のfreeze後reveal / dedicated composition、`business-rules.md` のidentity continuity / trace、`requirements.md` のblind skeleton、`technology-stack.md` のlocal Git / CI境界を正本とする。脅威は早期fixture開示、wrong worktree、patch escape、HEAD drift、CI artifact spoofingである。

## Blind and repository isolation

- #1252 materializationはArm T freeze eventとtarget integration worktreeへbindしたU2 grantだけを使う。Arm T authoring worktree、Arm S input、main worktreeへのcopyを禁止する。
- compositionはhealthy baseline、Arm T owned diff、#1252 allowed patchの順だけを許し、各diff / tree / commit identityを検証する。allowlist外hunk、merge commit、dirty treeを拒否する。
- local / CI processはU4のJDK / jar / network-deny / array argv profileを継承する。
- CI token / environment / runner metadataはallowlistしてreceiptへhash identityだけを保存し、credential値をartifactへ含めない。

## Artifact verification

CI trust rootはexpected repository、event=`workflow_dispatch`、healthy baseline上のtrusted workflow path / blob SHA、workflow ref=healthy baseline SHA、run attempt=1、conclusion=success、declared minimal permissions、checkout SHA=CompositionHead resulting commitを固定する。PR / fork event、workflow definition / ref drift、別checkoutを拒否する。CI metadataはprovider / workflow / job / run / head SHA / command identityをmachine-readable sourceから取得する。

artifact archiveはcompressed 128 MiB、uncompressed 72 MiB、logical entries exactly 13（CI manifest 1 + 2 bundles × envelope / 5 payloads）を上限とする。entry role / canonical relative pathをallowlistし、absolute / `..` / duplicate / case collision / directory / symlink / hardlinkを拒否する。streaming extract中にentry / aggregate byte capとSHA-256を検証し、exactly 2 rows、execution manifest / CompositionHead / input identity、DETECTED / counterexample / bundle refsを再検証する。

untrusted PR / fork artifact、workflow / ref / permissions / checkout drift、archive bomb / traversal / link / duplicate、head SHA mismatch、row duplicate / missing、credential / absolute path、local semantic tuple driftを成功proofへ採用しない。

## Verification

freeze前 / cross-worktree reveal、patch escape、HEAD / tree drift、dirty worktree、CI trust-root / head / artifact / row spoof、安全でないarchive entry、secret environment leakageをred fixtureとする。main merge、Arm S input leakage、TLC network accessは0件とする。
