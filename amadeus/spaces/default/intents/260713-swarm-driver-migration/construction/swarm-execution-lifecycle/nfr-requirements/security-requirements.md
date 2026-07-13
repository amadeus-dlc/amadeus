# Swarm Execution Lifecycle Security Requirements

## 上流とdata classification

本成果物はU-02の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-02はprovider認証を新設せず、利用者の既存CLI認証をbehavior probeとnative executionで使用する。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| execution/attempt/run/operation ID、closed state/reason/count | internal | yes | versioned closed schema |
| plan/wave/manifest/request/result digest | internal | yes | canonical hash + exact binding |
| PID/PGID/start token、host identity | sensitive operational | hash/必要最小限のみ | exact process identity、生hostname非保存 |
| credential/token/cookie/SSH material | restricted | no | child env allowlist、canary scan |
| prompt、生stdout/stderr、生provider response、check command全文 | confidential/tainted | no | adapter normalization、ephemeral input |
| worktree path/branch/commit | internal repository metadata | digestまたはconfined value | repo/ownership/base binding |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U02-SEC-01 | child process環境はadapterが宣言する必要最小限の既存keyだけを投影し、親env全体を無条件継承しない | secret canary child/audit/stdout混入0件 |
| U02-SEC-02 | `LaunchSpec`はexecutable/argv/env/cwd/stdinを分離し、shell commandを構築しない | metacharacter fixtureで追加command 0件 |
| U02-SEC-03 | 生provider streamはadapter境界でclosed `NormalizedDriverEvent`へ変換し、共通runtime/checkpoint/audit/fixtureへ渡さない | planted raw/secret field拒否 |
| U02-SEC-04 | checkpoint/audit/referee envelopeは`additionalProperties=false`相当のclosed version schemaで検証する | unknown/secret-like field rejection |
| U02-SEC-05 | prepared worktree、repo、ownership marker、base/head/target、protected spec blobをexact bindする | path traversal、別repo、別commitで副作用0 |
| U02-SEC-06 | process/group操作はPID/PGID/start token/run/operation binding一致時だけ行う | PID reuse/identity mismatchでsignal 0 |
| U02-SEC-07 | one-time armはexecution/attempt/run/plan/wave/fencingまたはoperation/claimへ束縛し、再利用を拒否する | replay fixtureでchild起動0 |
| U02-SEC-08 | finalize requestはexpected/claimed/declined、check/protected spec、merge target/strategy/message、全Unit identityをdigestへ含める | binding差替えでcheck/merge 0 |
| U02-SEC-09 | stale writer/primitiveは各不可逆substep直前のclaim CASで拒否する | 追加audit/state/git mutation 0 |
| U02-SEC-10 | runtime dependency、network service、dynamic plugin/module discoveryを追加しない | package/lock/static import guard |

## STRIDE assessment

| Threat | Exposure | Required mitigation |
|---|---|---|
| Spoofing | provider、wrapper、worktree、claim owner偽装 | behavior probe、process start identity、ownership/base binding、claim CAS |
| Tampering | checkpoint/audit/arm/request/protected spec改変 | canonical digest、atomic write、fencing、git object baseline、closed schema |
| Repudiation | selection・fallback・Unit merge・resumeの否認 | execution IDからredacted transition/evidence/finalizeを相関 |
| Information disclosure | credential、prompt、raw stream、command、生hostname漏えい | env allowlist、normalizer、ephemeral input、secret canary |
| Denial of service | 巨大manifest/event、live claim、orphan process | 既存input上限、linear index、fixed lease/heartbeat、exact group回収 |
| Elevation of privilege | shell injection、別repo/pathへのmerge、stale owner実行 | argv分離、confined path、repo/commit binding、one-time arm/fencing |

## Compliance and audit

決済、PHI、規制対象個人データを新規処理しないため、PCI-DSS/HIPAA/GDPRへの新規適合を表明しない。共通controlとして、credential非保存、least-data child環境、改ざん検知可能なdigest、単一writer、secret scan、dependency pinを証拠化する。

auditにはraw値ではなくschema version、closed ID/state/reason、redacted count/digestを残し、execution IDからselection、probe、evidence、fallback、finalizeまで欠落なく追跡できることを要求する。

## Security test gate

path traversal、symlink/ownership不一致、PID reuse、arm replay、stale fencing、request差替え、unknown field、secret canary、shell metacharacter、protected spec改変をfailure injectionへ含める。Critical/High相当またはsecret漏えい1件はmerge blockerで、skipをpassへ読み替えない。network/IaC/cloud scanは新しい対象を導入しないためN/Aである。
