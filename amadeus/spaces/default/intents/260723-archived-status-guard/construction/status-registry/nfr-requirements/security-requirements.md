# Security Requirements — status-registry

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`からlocal filesystem trust boundaryを定義する。registryはinternal lifecycle metadataであり、PII、credential、payment、health dataを扱わない。

## Input and path controls

- intents.json全体をuntrusted bytesとしてJSON decodeし、全entryをstrict parseする。
- `closed`、未知status、非文字列、欠落、malformed JSONをwrite前に拒否する。
- migration targetは固定dirName完全一致であり、caller supplied pathや任意from/toを受け取らない。
- read/write先は既存workspace resolverが返すintents.jsonだけに限定し、`..`、absolute path、事前に存在するsymlink経由のworkspace外writeを許可しない。
- atomic temp fileはtargetと同じdirectoryに作り、rename先を再検証する。

## Diagnostic controls

- invalid valueは型名と最大256 UTF-8 bytesのJSON-safe previewだけを出す。先にJSON-safe escapeし、UTF-8 code point境界で切り詰め、結果を再encodeして256 bytes以下かつvalid UTF-8であることを確認する。
- 循環object、binary、巨大payloadをそのままserializeしない。
- errorにregistry全内容、user home、credential-like environment valueを含めない。
- target rowはdirNameまたはrow indexで識別し、必要最小限のcontextだけを返す。

## Threat scenarios

| Threat | Control | Verification |
|---|---|---|
| malformed registryによるsilent reset | parse failureをloud reject、bytes不変 | malformed fixtures |
| path traversal / workspace外write | fixed resolver + canonical containment | traversal/symlink fixture |
| diagnostic resource exhaustion | bounded preview | 1MiB string/cyclic input |
| arbitrary status escalation | closed transition API、target専用migration | corpus scan |
| dependency supply-chain拡大 | runtime dependency追加なし | lockfile/package diff |

## Threat boundary

保証対象はmalformed/hostile registry bytes、誤ったCLI input、実行開始時点ですでに存在するworkspace外symlinkである。workspaceを同じOS user権限で同時に書き換えられる悪意あるprocessは対象外であり、そのactorはcheck後にdirectory entryを差し替えられるためapplication-level containmentだけでは防げない。通常の並行Amadeus processはworkspace lockで直列化する。将来adversarial same-user actorを対象に含める場合はdirectory handleとno-follow相当のOS primitiveを別要件として導入する。

## Compliance

規制対象dataはなく、GDPR/HIPAA/PCI等の追加controlはN/A。既存repository access control、PR review、audit trailを維持し、新しいexternal data transferやretention policyを作らない。
