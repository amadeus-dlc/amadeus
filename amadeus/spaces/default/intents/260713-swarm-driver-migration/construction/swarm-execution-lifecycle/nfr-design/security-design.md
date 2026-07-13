# Swarm Execution Lifecycle Security Design

## 入力契約とtrust boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。trust boundaryは、利用者env、provider stream、process identity、prepared worktree、Git object、ephemeral finalize入力から、closed checkpoint/audit/referee protocolへの各入口である。U-02は新しい認証基盤を持たず、既存CLI認証をleast-data child environment経由で利用する。

## Defense-in-depth layers

| Layer | Component | Control | Rejection point |
|---|---|---|---|
| 1 | `ChildEnvironmentProjector` | adapter宣言keyだけをallowlist projection | spawn spec生成前 |
| 2 | `LaunchSpecValidator` | executable/argv/env/cwd/stdin分離、shell command禁止 | wrapper spawn前 |
| 3 | `PreparedManifestBinder` | repo、ownership、confined path、base/head、Unit全単射 | worktree使用前 |
| 4 | `ArmedProcessSupervisor` | PID/PGID/start token/run/arm exact binding | provider/primitive起動前 |
| 5 | `DriverEventNormalizer` | raw streamからversioned closed eventだけをproject |共通runtime入力前 |
| 6 | `TransitionSchemaGuard` | checkpoint/auditのclosed schema、canonical digest、fencing |永続化前 |
| 7 | `FinalizeRequestBinder` | expected/claimed/declined、check/spec、repo/target/strategy、全Unit identityを固定 | referee副作用前 |
| 8 | `FinalizeClaimGuard` | owner/lease/token CASを各不可逆substep直前に再検証 | audit/state/git mutation前 |

## Process and privilege containment

- wrapperは専用process groupで起動し、自分のPID、PGID、process start token hash、run/operation ID、arm digestをatomic identity fileへ保存する。
- childはidentityがcheckpoint/progressへmaterializeされ、execution/attempt/run/plan/wave/fencingまたはoperation/claimへ束縛したone-time armをconsumeした場合だけ起動する。
- PID/PGIDだけでsignalせず、start token、run/operation、bound pathがすべて一致するgroupだけを停止する。PID reuseやidentity mismatchではsignalを0件にする。
- child environmentはprovider adapterが宣言した既存keyだけを含み、親env全体、unrelated `AMADEUS_*`、token/cookie/SSH materialを無条件継承しない。
- executableとargvを構造化valueとして渡し、shell interpolation、command concatenation、dynamic plugin/module discoveryを使わない。

## Data protection and persistence policy

| Data | Runtime handling | Persistent representation |
|---|---|---|
| credential/token/cookie/SSH | child envで必要時のみ | 0件 |
| prompt/raw stdout/stderr/provider response | adapter内でstream処理 | 0件 |
| check command/commit message | referee invocationのephemeral input | canonical digestのみ |
| hostname/PID/start identity | liveness検証に必要時のみ | closed ID/hash、必要最小限 |
| plan/wave/manifest/request/result | immutable canonical value | schema version + digest + redacted count/ID |
| protected spec | confined relative path + Git object read | base blob digest、target/Unit digest |

checkpoint、audit、request、claim、progress、resultは`additionalProperties=false`相当のversioned allowlistで検証する。secret-like field、unknown field、生値はsmart constructorとschema guardの両方で拒否する。local file at restの追加暗号化は新しいsecret storeを導入せず、restricted data自体を保存しない設計で回避する。

## Request integrity and anti-replay

`FinalizeRequestBinding`はexecution/attempt/invocation/batch、plan/manifest、canonical expected/claimed/declined、check/spec、repo/base/target、strategy/message digest、Unitごとのworktree/base/head、attempt-local pathを固定する。refereeは生入力からdigestを再計算し、create-if-absent request recordとexact matchしない場合、check/merge/audit mutationを0件にする。

armはone-time consume、claimはlease/fencing CASとする。stale arm、別wave arm、別request result、別target HEAD、別protected-spec blob、別owner tokenをsuccessへ再利用しない。各immutable recordはIDだけでなく内容digestを照合する。

## Threat containment and verification

| Threat | Containment | Required test |
|---|---|---|
| shell/env injection | environment projector + `LaunchSpecValidator` | metacharacter/secret canary |
| path/repo/worktree spoof | confined path + repo/ownership/base binding | traversal/symlink/別repo fixture |
| PID reuse/orphan child | identity-first/arm + exact group | reuse/identity crash fixture |
| stale writer/claim replay | lease/fencing/claim guard | 2 process race、mutation 0 |
| request/protected spec tamper | immutable binding + Git object baseline | field/blob差替え fixture |
| raw provider leakage | streaming normalizer + closed schema | planted raw/secret rejection |
| lying conductor | referee re-verification | claimed/evidence不一致でmerge 0 |

Critical/High相当、secret漏えい、unarmed child、stale mutationのいずれか1件をmerge blockerにする。HTTP、CSRF、security headers、cloud IAM/KMS/network scanはsurfaceがないため非適用であり、skipをpassへ読み替えない。
