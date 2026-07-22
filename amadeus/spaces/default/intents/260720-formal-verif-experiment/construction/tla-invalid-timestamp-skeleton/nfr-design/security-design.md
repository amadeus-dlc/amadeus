# Security Design — tla-invalid-timestamp-skeleton

## 上流と isolation

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、blind reveal、composition、CI artifactのtrust boundaryを閉じる。

## CompositionPolicy

`CompositionPolicy` はArm T freeze-bound U2 grantだけをintegration worktreeへmaterializeし、authoring/main/Arm S worktreeを拒否する。healthy baseline→Arm T owned diff→#1252 allowed patchの順にcanonical hunk/tree/commitを検証し、merge commit、dirty tree、path escapeを拒否する。local/CI processはU4 network-deny/JDK/jar/argv profileを継承する。

## CiArtifactVerifier

trust rootはrepository、workflow_dispatch、trusted baseline上のworkflow blob/ref、runAttempt=1、run/job conclusion=`success`、minimal permissions、checkout=CompositionHead commitに固定する。missing/unknown/failure/cancelled conclusionを拒否する。provider metadataをmachine-readable APIから取得しcredential値を保存しない。

archiveはcompressed 128 MiB、uncompressed 72 MiB、entries exactly 13に閉じ、stream extractでabsolute/traversal/duplicate/case collision/directory/symlink/hardlinkを拒否する。2 rowsとmanifest/composition/input/bundle identitiesを再hashする。

## Verification

freeze前/cross-worktree reveal、patch/head/tree drift、CI ref/permission/checkout spoof、missing/unknown/failure/cancelled conclusion、archive bomb/path/link/duplicate、row missing/duplicate、secret leakageをred fixtureにする。main merge、Arm S input leakage、TLC network access=0である。
