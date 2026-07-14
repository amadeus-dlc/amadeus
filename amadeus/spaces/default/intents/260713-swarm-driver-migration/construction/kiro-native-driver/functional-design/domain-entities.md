# Kiro Native Driver Domain Entities

## モデリング方針と上流参照

U-05はKiro adapterのimmutable value、balanced collection、runtime agent binding、versioned session projectionを定義する。persistent process/checkpoint/referee aggregateはU-02/C-09/C-11が所有する。本成果物は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を消費し、新しいdatabaseやprovider session正本を作らない。

raw Kiro metadata/JSONL/stdoutはparserの短命bufferだけに置き、prompt、message、summary、tool payloadをdomain entityへ渡さない。

## KiroAdapterRegistration

```text
KiroAdapterRegistration
  provider = kiro
  adaptersByDriver:
    kiro-subagent -> KiroSubagentAdapterView
```

constructorはprovider/key/adapter.driverの一致、cardinality=1、他provider key不在を検証する。Kiro CLIとKiro IDEは同じregistrationを使う。

## KiroSubagentAdapterView

```text
KiroSubagentAdapterView
  driver = kiro-subagent
  provider = kiro
  surfaceProfiles: immutable supported set
  splitWaves(units): KiroWaveSet
  probe(input): KiroProbeResult
  prepareResources(input): AdapterResourcePreparation
  buildExecution(input, resources: MaterializedAuxiliaryResourceSet): AdapterExecutionPlan
  normalize(inputs, context): NormalizedDriverEvent stream
```

methodはI/Oを直接行わずpure planまたはclosed projectionを返す。process/session/capture writeはU-02 supervisorへ委譲する。

## KiroWaveSet

```text
KiroWaveSet
  inputUnitDigest
  waves: non-empty ordered KiroUnitWave[]
  totalUnits

KiroUnitWave
  index: zero-based contiguous integer
  units: ordered unique UnitRef[2..4]
  waveDigest: sha256
```

smart constructorは`waveCount=ceil(n/4)`、`base=floor(n/waveCount)`、先頭remainderへ1件加算して構築する。`flatten()`は元の順序と集合をexact返し、`nextAfter(verifiedIndex)`だけが次waveを公開する。drop/duplicate/1件wave/差2以上を表現できない。

## KiroSurfaceProfile

```text
KiroSurfaceProfile
  schemaVersion = 1
  profileId: kiro-cli-2-v2-session-v1 等
  cliVersionRange
  engine = v2
  launchFlags: no-interactive / agent / agent-engine / wrap
  agentConfigSchemaDigest
  metadataPaths:
    sessionId / cwd / createdAt / updatedAt / agentName
    parentSessionId
    terminalStatus
  eventPaths:
    parentTurnTerminal / childSummaryTerminal
  fixtureDigest
```

profileはfield path/type/cardinalityだけを持ち、raw sampleを持たない。credentialed fixtureで実測したversionだけを選び、V3や未知minorへ近いprofileを流用しない。parent relation/terminal statusが取得不能ならconstructorは存在しない。

## KiroProbeResult

```text
KiroProbeResult
  status: available | unavailable | error
  reason: closed FallbackReason
  cliVersion
  engine = v2 | absent
  modeIdentifier = kiro-subagent-v1 | absent
  authClass: browser | api-key | enterprise | unknown
  surfaceProfileId | absent
  agentConfigSchemaDigest | absent
  behaviorSessionDigest | absent
  checks: ordered immutable ProbeCheck[]
```

availableはCLI/help/auth/agent validation/behavior/session profileの全成功を要求する。auth classにemail、token、account IDを含めない。

## KiroAssignmentToken

```text
KiroAssignmentToken
  value: 20-char lowercase base32
  digest
  executionId / attemptId / waveDigest / unitSlug binding
```

同一bindingでは決定的、attempt変更で別値となる。tokenからUnit名を逆算できない。

## KiroRuntimeAgentRole

```text
KiroRuntimeAgentRole =
  ParentRole(
    name = amadeus_kiro_p_<wave-token>,
    tools = read / thinking / subagent,
    availableAgents = exact worker role set,
    trustedAgents = exact worker role set
  )
  | WorkerRole(
    name = amadeus_kiro_u_<assignment-token>,
    unitSlug,
    tools = read / write / thinking,
    readWriteRoot = CanonicalPreparedWorktree,
    deniedRoots
  )
```

role名はclosed regex、reserved built-in/global/local既存名と非衝突である。ParentRoleはwrite/shell/MCPを持てず、WorkerRoleはsubagent/shell/MCPを持てない。worker configはmodelをpinしない。

## KiroRuntimeAgentConfig

```text
KiroRuntimeAgentConfig
  role: KiroRuntimeAgentRole
  canonicalPath: reserved local agent path
  configBytes: validated agent-v1 JSON
  configDigest
  ownerTokenDigest
  state: planned | materialized | armed | sealed | disposed
```

許可transitionは順方向だけである。materializedはexclusive create、regular file、realpath confinement、name/path一致を要求する。armed後はimmutable digestを維持し、sealed後のowner一致時だけdisposed cleanupできる。cleanup未完了はwave成功へ投影できない。resume時の旧configは旧process停止/capture join/fencing一致後だけreconcile disposalでき、新attempt roleへ再利用しない。

## KiroUnitRoleBinding

```text
KiroUnitRoleBinding
  unitSlug
  assignmentToken
  workerRole
  preparedWorktree
  dependencyUnits
```

wave constructorはUnit/token/role/worktreeを全単射にする。main checkout、他wave Unit、同一path、symlink escapeを拒否する。

## KiroWaveManifestV1

```text
KiroWaveManifestV1
  executionId / attemptId / nonceHash / planDigest
  waveIndex / waveDigest
  parentRole
  bindings: ordered KiroUnitRoleBinding[]
  convergenceCommand: provider-only sensitive input
  protectedSpecPath: provider-only path
```

stdinだけにserializeする短命valueである。audit projectionはcommand/spec/raw pathを落とし、manifest/Unit/role/path digestだけを返す。

## KiroLaunchConfig

```text
KiroLaunchConfig
  executable = kiro-cli
  argv: immutable separated args
  cwd: canonical project root
  env: AllowlistedProviderEnvironment
  transport = stdio-json(output = jsonl)
  stdin: Uint8Array(KiroWaveManifestV1)
  stdinCloseRequired = true
  timeoutMs: fixed policy
```

argvは`chat --agent <parent> --agent-engine v2 --no-interactive --wrap never`と固定instructionを要求する。`--v3`、`--trust-all-tools`、dynamic prompt/worktree/commandを拒否する。

## KiroSessionInventory

```text
KiroSessionInventory
  root: canonical Kiro session root
  capturedAtMonotonic
  files: frozen set<relativeName, fileIdentityDigest>
  profileId
```

file本文を保持しない。baselineとsealed inventoryの差分からarm後fileだけを`NewKiroSessionFileSet`へparseする。symlink、unknown suffix、root escape、baseline identity再利用を拒否する。

## KiroSessionCapturePlan

```text
KiroSessionCaptureProjection
  kind = event-bound-provider-path
  captureId / ownerTokenDigest
  executionId / attemptId / nonceHash / planDigest / waveDigest
  parentRole / expectedWorkerRoles
  runtimeConfigSetDigest
  baselineInventoryDigest
  channels = process-stream / session-metadata
  startBeforeProviderArm = true
  stopAfterProviderGroupTerminal = true
```

adapterのpure `prepareResources`はruntime agent configごとの`attempt-owned-file`とsession rootの`pre-arm-baseline`だけを返す。既存canonical `.kiro/agents/` rootはU-02がidentity、directory種別、symlink不在、project confinement、ownerを検証するが、attempt-owned resourceやcleanup対象にはしない。adapterはmaterialize/cleanup I/Oを行わず、U-02のmaterialized setを受けたpure `buildExecution`が同じresource digestを持つ具体的launch/capture planを返す。allowlist済みparent-session eventから`EventBoundCaptureBinding`を純粋に解決し、U-02がbinding checkpoint後にexact session metadata readを有効化する。

planはI/Oを行わない。U-02 supervisorがinventory、observer、join、sealを所有する。

## KiroSessionMetadataProjection

```text
KiroSessionMetadataProjection
  sessionId
  cwdDigest
  agentName
  parentSessionId: optional only for parent, required for child
  createdAt / updatedAt
  terminalStatus: running | completed | failed | interrupted | unknown
  sourceFileDigest
```

versioned parserだけが生成できる。title、prompt、message、summary、tool payload、raw eventは型上保持できない。childのunknown statusはsuccessではない。

## KiroParentSession

```text
KiroParentSession
  sessionId
  role: ParentRole
  cwdDigest
  processIdentityDigest
  state: started | terminal-completed | terminal-failed
```

new metadataがexactly 1件、role/cwd/process wave一致の場合だけ生成する。parent session IDのaudit projectionはdigestだけである。

## KiroChildSessionLifecycle

```text
KiroChildSessionLifecycle
  unitSlug
  workerRole
  childSessionId
  parentSessionId
  state: expected | started | completed | failed | invalid
  metadataDigest / terminalEventDigest
```

`expected -> started`はparent relationとagent name一致、`started -> completed`はversioned terminal completedだけで許可する。session file存在、summary本文、Unit成果からcompletedを推定しない。

## KiroWaveEvidenceAggregate

```text
KiroWaveEvidenceAggregate
  wave: KiroUnitWave
  parent: KiroParentSession
  childrenByRole: immutable closed map
  processTerminal: completed | failed
  captureState: joined-and-sealed | invalid
```

`verify()`はparent 1件、2〜4 children、Unit-role-child全単射、全child completed、process/session/nonce/plan/wave/capture一致を確認して共通`EvidenceVerdict`へprojectする。worktree成果は受け取らない。

## Conductor handoff envelopes

```text
NativeWaveEvidenceEnvelopeV1
  schemaVersion = 1
  executionId / attemptId / nonceHash / planDigest / waveDigest
  unitBindingsDigest
  nativeEvidenceVerdict
  evidenceDigest
  cleanupState = disposed

RefereeCheckResultEnvelopeV1
  schemaVersion = 1
  executionId / attemptId / nonceHash / planDigest / waveDigest
  checkedUnitBindingsDigest
  status: green | red
  resultDigest
  refereeFencingDigest
```

C-01/C-08は`NativeWaveEvidenceEnvelopeV1`をharness conductorへ返し、C-11を呼ばない。conductorはそのenvelopeをC-11の`check`へ渡し、返されたwire resultを`RefereeCheckResultEnvelopeV1`としてC-01のcheckpoint commandへ渡す。C-01とC-11は同じsource moduleのdomain typeをimportせず、各境界でschema versionとbindingを独立に検証する。C-11もC-01/C-07/C-08を呼ばない。

finalizeも同じ境界を使う。C-01がconductorへ返すbound requestと、C-11がconductorへ返すresult envelopeは、execution/attempt/nonce/planと全wave result digestへ束縛する。conductorは`record-finalize(kind=request) → C-11 finalize → record-finalize(kind=result)`の順で個別に呼び、どちら側にも相手への参照を渡さない。

## KiroFailure

```text
KiroFailure =
  KIRO_CLI_UNAVAILABLE
  | KIRO_UNSUPPORTED_ENGINE
  | KIRO_AUTH_UNAVAILABLE
  | KIRO_AGENT_CONFIG_INVALID
  | KIRO_TRUST_INSUFFICIENT
  | KIRO_NON_INTERACTIVE_APPROVAL_REQUIRED
  | KIRO_STDIN_MANIFEST_UNSUPPORTED
  | KIRO_SESSION_PROFILE_UNKNOWN
  | KIRO_PARENT_SESSION_MISMATCH
  | KIRO_CHILD_COUNT_MISMATCH
  | KIRO_CHILD_BINDING_MISMATCH
  | KIRO_CHILD_TERMINAL_INVALID
  | KIRO_RUNTIME_AGENT_COLLISION
  | KIRO_CAPTURE_FAILED
  | KIRO_COORDINATOR_FAILED
```

failureはpre/post-dispatch phase、retryability、redaction済みcodeだけを持つ。raw exception/stdout/session/envを持たない。pre-dispatchだけがfallback reasonへ投影可能である。

## Lifecycleと所有権

| Data | Owner | Lifetime | 永続projection |
|---|---|---|---|
| runtime agent bytes | C-07 plan → U-02 | wave | config digest/role |
| raw session/stdout | U-02 capture/parser | parse中だけ | なし |
| session projection | C-07 → C-08 | wave | ID/status/file digest |
| wave evidence verdict | C-08/C-09 | checkpoint | redaction済みsummary |
| native evidence/check handoff | harness conductor | call間だけ | C-01/C-11の各versioned envelope digest |
| Unit result/merge | C-11 | workflow | referee envelope |

C-01/C-07/C-08とC-11の間に直接のdata ownership arrowはない。harness conductorがprepared envelope、wave evidence、check receipt、finalize request/resultを順序付けて媒介する。

## Confidentiality invariants

1. credential、email、account、tokenをentityへ置かない。
2. raw session、JSONL、prompt、message、summary、tool input/outputを永続化しない。
3. runtime agent configにcredential、Unit prompt、convergence commandを置かない。
4. auditはsession ID/path/owner tokenのdigestだけを使う。
5. workerのwrite/read境界からmain、他worktree、session/evidence/config rootを除く。
6. unknown provider fieldをcatch-all mapへ保存しない。
