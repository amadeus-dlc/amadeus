# Tech Stack Decisions — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript / ESM | Matches `technology-stack.md` and installer package direction |
| Runtime | Bun | Required by `requirements.md` FR-002 and current toolchain |
| Manifest storage | JSON at `amadeus/.installer/amadeus-setup-manifest.json` | Required by FR-013 |
| Manifest read contract | `readManifest(): InstallerManifest | null` | Keeps invalid/unreadable manifest fallback explicit |
| Schema validation | small local validator or justified dependency | Manifest integrity is safety-critical |
| Snapshot hashing | md5 over binary file content | Required by FR-013 and downstream shared-file policy |
| Filesystem access | `FileSystemPort` / `ManifestStorePort` | Keeps read-only target behavior testable |
| Prompt handling | optional `PromptPort` inside `detectTarget` | Resolves `kiro` / `kiro-ide` ambiguity only when allowed |

## Explicit Non-Decisions

- Do not write manifest during detection.
- Do not repair invalid manifests.
- Do not decide overwrite, backup, or conflict policy.
- Do not run post-install verification.
- Do not recursively scan the full target workspace.

## Dependency Policy

Any runtime dependency added for JSON schema validation, md5 hashing, or path handling must include:

- purpose;
- why Bun/TypeScript standard APIs are insufficient;
- license compatibility;
- package size impact;
- vulnerability scan result;
- portability notes for macOS, Linux, and Windows-compatible shells.

## CI And Tooling

U3 implementation must integrate with:

- `bun run typecheck`;
- U6 target fixture tests for all target states;
- U6 portability fixture for paths with spaces and md5 stability;
- U7 package/dependency gates;
- no target write assertions using fake filesystem ports.

## Portability Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Manifest paths | platform path APIs for filesystem, portable relative paths inside manifest | Separates local filesystem behavior from stable manifest data |
| Sentinel paths | explicit path list per harness | Avoids recursive scan and OS-specific discovery behavior |
| Hashing | binary md5 | Stable downstream comparison |
| Unknown file handling | omit md5 when unreadable | Avoids unsafe false equivalence across filesystems |

## Upstream Coverage

- `business-logic-model.md`: U3 detection, snapshot, and manifest write ownership drive decisions.
- `business-rules.md`: manifest, sentinel, classification, and snapshot rules drive technology constraints.
- `requirements.md`: FR-006 / FR-011 / FR-013 / NFR-002 / NFR-003 / NFR-004 are primary constraints.
- `technology-stack.md`: TypeScript/ESM/Bun and current CI define the implementation baseline.
