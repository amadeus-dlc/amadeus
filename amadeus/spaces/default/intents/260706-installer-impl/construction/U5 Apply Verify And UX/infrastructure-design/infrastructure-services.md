# Infrastructure Services — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Service Inventory

U5 introduces no managed service. It uses local adapter services inside the setup package:

| Boundary | Role | Write access |
|---|---|---|
| Reporter Service | render plan, errors, and final results | none |
| Prompt Service | ask allowed confirmations only | none |
| File Apply Service | execute approved plan operations | target files and backup paths |
| Manifest Store Service | write installer manifest atomically | manifest temp file and final manifest |
| Verification Service | check manifest entries and readiness paths | none |
| Result Classification Service | map structured outcomes to exit/report contract | none |
| fake filesystem/prompt ports | CI fault injection and call-order assertions | test only |

## FileSystem Boundary

U5 is the first unit that may write target files. The write-capable `FileSystemPort` is injected only into `FileApplier` and `ManifestStore`; Reporter, Prompt Adapter, ResultClassifier, and Verifier must not receive write-capable ports unless needed for read-only verification methods.

| Operation kind | Filesystem behavior |
|---|---|
| `skip` | no filesystem call |
| `conflict` | no filesystem call |
| `backup` | copy/rename existing target path to approved `backupPath` |
| `add` | copy from operation `sourcePath` to target path |
| `update` | copy from operation `sourcePath` to target path |
| `force-update` | copy from operation `sourcePath` to target path after preceding backup when required |

U5 never derives a new `sourcePath` from a distribution object. The operation is the contract.

## Manifest Boundary

Manifest write begins only after `ApplyResult.ok === true`. The manifest writer:

- creates the manifest directory if needed;
- writes JSON to a temp file inside that directory;
- renames the temp file to the fixed manifest path;
- returns failure separately from file apply failure.

Manifest repair, migration, and rollback are out of scope.

## Verification Boundary

Verification reads only manifest entries and fixed readiness paths. It does not repair missing files, rewrite manifest data, traverse the whole target tree, or recalculate file md5 for every installed file.

## External Service Boundary

U5 uses no GitHub, npm, network, queue, database, cache, IAM, or secret-management service. GitHub Actions and release workflow concerns are downstream U7/U8 pipeline surfaces.

## Upstream Coverage

- `performance-design.md`: service inventory maps to bounded render/apply/manifest/verify paths.
- `security-design.md`: write-capable ports are limited to FileApplier and ManifestStore, preserving no-write and report-only paths.
- `scalability-design.md`: services keep single-target sequential state and avoid daemon/global cache.
- `reliability-design.md`: manifest and verification boundaries preserve state-machine outcomes.
- `logical-components.md`: SetupApplicationService, FileApplier, ManifestStore, Verifier, Reporter, PromptAdapter, ResultClassifier are represented.
- `components.md`: File Applier and Manifest Store ownership stays downstream from Operation Planner.
- `services.md`: manifest lifecycle, local service model, and PR gates define service constraints.
- `business-logic-model.md`: Apply, Manifest, Verification, Reporter, and Prompt workflows define service behavior.
