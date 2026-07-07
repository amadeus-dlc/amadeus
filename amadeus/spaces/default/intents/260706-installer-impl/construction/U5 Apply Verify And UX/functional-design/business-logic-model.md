# Business Logic Model — U5 Apply Verify And UX

> Stage: functional-design / Unit: `U5 Apply Verify And UX`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U5 turns an approved `FileOperationPlan` into user-visible output and target filesystem effects. It owns Reporter output, Prompt Adapter confirmation, File Applier execution, manifest write after successful apply, manifest-write failure classification, and post-apply verification. It does not resolve versions, detect target state, or recalculate planning policy.

## Apply Workflow

1. Receive `FileOperationPlan` from U4.
2. Render plan before any target write.
3. If `canApply` is false, render no-write result and stop.
4. If `requiresConfirmation` is true and confirmations are allowed, prompt user.
5. If user declines or confirmation is not allowed, stop with no-write result.
6. Execute operations in order:
   - `skip` and `conflict` are not mutating operations;
   - `backup` copies or renames target file to approved backup path;
   - `add`, `update`, and `force-update` copy from operation `sourcePath` to target path.
7. If any backup or copy operation fails, return `ApplyResult` with `ok: false`, failed phase, failed operation, completed operations, backup records, and diagnostics.
8. Only when all mutating operations complete, return `ApplyResult` with `ok: true`.

## Manifest Workflow

1. After `applyPlan` returns `ok: true`, Application Service builds `InstallerManifest`.
2. Application Service calls `writeManifest`.
3. `ManifestStorePort.writeManifestAtomic` writes temp file in manifest directory and renames into place.
4. If manifest write succeeds, continue to verification.
5. If manifest write fails, classify result as `manifest-write-failed`, set `applyResult.manifestWrite` to `failed`, return non-zero, and report applied operations and backup diagnostics.
6. Future upgrade will not classify the target as `manifest-installed` unless the manifest exists and is valid.

## Verification Workflow

1. Read manifest file entries.
2. Check required files exist.
3. Check selected harness directory exists.
4. Check tools directory exists.
5. Check active-space memory shell exists.
6. Tolerate absence of runtime state/intent for a freshly installed target.
7. Return `VerificationResult` with passed/failed checks.

## Reporter Workflow

1. Render help/plan/error/result as plain text.
2. Preserve stable plan table columns: `Operation`, `Files`, `Example`.
3. Include no-change guarantee where no target mutation occurred.
4. Include one concrete next action in classified errors.
5. Mark force-applied operations clearly.
6. Show backup paths in pre-apply plan and final result.

## Prompt Workflow

1. Prompt only when `InteractionMode.promptsAllowed` or `confirmationsAllowed` permits it.
2. Choose harness and target only for missing values allowed by upstream mode rules.
3. Confirm apply only for `requiresConfirmation` plans.
4. Default confirmation is no-write.
5. Do not prompt in `--yes` or non-TTY mode.

## Error Handling

| Error Family | U5 Behavior |
|---|---|
| `canApply: false` plan | render no-write, no mutation |
| declined confirmation | no mutation |
| backup failure | return `ApplyResult.ok: false`, stop, do not write manifest |
| copy failure | return `ApplyResult.ok: false`, stop, report partial apply diagnostics, do not write manifest |
| manifest write failure | report applied files, non-zero, future upgrade fallback |
| verification failure | report failed checks, non-zero |

## Integration Boundaries

- U4 supplies the approved `FileOperationPlan`.
- U5 uses `sourcePath` embedded in mutating operations; it does not receive a separate distribution object.
- U5 calls `ManifestStorePort.writeManifestAtomic` only after apply succeeds.
- `services.md` and `component-methods.md` make Application Service the owner of transaction sequencing.
