# Reliability Design — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Reliability Objectives

U5は承認済みplanからdeterministicで説明可能な結果を返す。`reliability-requirements.md` の通り、no-writeはno-writeのまま、partial applyは分類され、manifest writeはfile apply成功後だけ実行され、verification failureはfailed check namesを持つ。

## Result State Machine

| State | Trigger | Result |
|---|---|---|
| no-write | `canApply:false`, declined confirmation, confirmation not allowed | no mutation, manifest `not-started`, classified no-write report |
| apply-failed | backup/copy failure | `ApplyResult.ok:false`, failed phase/operation, completed operations, backups, manifest `not-started` |
| manifest-write-failed | apply ok, manifest write fails | non-zero, applied operations visible, future upgrade falls back |
| verification-failed | manifest written, verification fails | non-zero, failed check names visible |
| success | apply ok, manifest written, verification ok | success report with harness/version/tag/target/manifest/backups/next steps |

## Ordering Invariants

- Reporter renders the plan before any mutation.
- Prompt Adapter is called only when prompts/confirmations are allowed.
- `backup` completes before dependent `update` / `force-update`.
- `conflict` and `skip` are not mutating operations.
- manifest write starts only after `ApplyResult.ok === true`.
- verification starts only after manifest write succeeds.
- final report is based on `ApplyResult`, manifest write result, and `VerificationResult`, not policy recalculation.

## Failure Handling

Backup failure stops before dependent copy and preserves completed operation evidence. Copy failure stops immediately, records the failed operation, and does not write manifest. Manifest write failure after successful apply is classified separately as `manifest-write-failed`; it must not be collapsed into file-copy failure. Verification failure does not imply automatic rollback.

Unexpected exceptions are converted to classified errors where possible. In all cases, success manifest is not written unless apply succeeded and atomic manifest write completed.

## Diagnostics Contract

| Outcome | Required diagnostics |
|---|---|
| no-write | reason code, no-change guarantee when true, one next action |
| apply-failed | failed phase, failed operation, completed operations, backup records |
| manifest-write-failed | manifest path, applied operation summary, backup records |
| verification-failed | failed check names, applied operation context |
| success | harness, distribution version, source tag, target path, manifest path, backup paths, next steps |

Reporter owns final wording, but these fields must be present in structured result inputs.

## Portability Reliability

Paths with spaces are covered by temp fixtures for copy, backup, manifest write, and verification. Filesystem paths use platform path APIs at adapter boundaries. Terminal output remains plain text without POSIX-only control assumptions.

Atomic manifest write uses temp file in the manifest directory followed by rename. If rename fails, manifest state is `failed`; partial temp artifacts are diagnostics only and must not be treated as installed manifest.

## Test Strategy

U6 covers:

- no-write plan calls no mutating ports;
- declined confirmation calls no mutating ports;
- prompt suppression under `--yes` / non-TTY;
- ordered backup then update/force-update;
- backup failure and copy failure;
- manifest write failure after apply;
- verification failed check names;
- success report snapshots;
- paths with spaces and separator portability;
- reporter snapshots generated from structured results.

## Upstream Coverage

- `performance-requirements.md`: result states are validated through the same render/apply/manifest/verification fixtures.
- `security-requirements.md`: no-write prevention、policy recalculation禁止、backup durability、manifest sequencing をinvariants化した。
- `scalability-requirements.md`: sequential apply、operation evidence、reporter output size constraints を維持する。
- `reliability-requirements.md`: outcome states、failure handling、ordering、diagnostics、portability を直接設計した。
- `tech-stack-decisions.md`: `ApplyResult`、`VerificationResult`、Reporter input models、PromptPort、atomic Manifest Store に従う。
- `business-logic-model.md`: Apply、Manifest、Verification、Reporter、Prompt workflows と Error Handling に沿う。
