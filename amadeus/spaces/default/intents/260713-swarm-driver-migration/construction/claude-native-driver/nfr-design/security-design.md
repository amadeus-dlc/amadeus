# Claude Native Driver Security Design

## 入力契約とtrust boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。trust boundaryは既存CLI auth/env、stdin manifest、attempt-owned settings/hook、Claude provider-state、stream/hook event、local pathからclosed C-05 domainへの入口である。credentialを取得・複製・永続化する新認証機構は作らない。

## Defense-in-depth layers

| Layer | Component | Control | Failure |
|---|---|---|---|
| 1 | `ClaudeAuthTransportProjector` | auth statusのclosed transport別env allowlist | unknown transport unavailable |
| 2 | `ClaudeBatchManifestProjector` | prompt/commandをstdinへ1回、argv/auditへ0件 | plan rejection |
| 3 | `ClaudeEphemeralSettingsFactory` | attempt ownership、0600、U-03 hookだけ | provider arm 0 |
| 4 | `ClaudeSessionPrefixAllocator` | lock + team/task exact path不存在 + symlink/owner guard | pre-dispatch stop |
| 5 | `ClaudeSurfaceProfileGuard` | version range、field path、event/type exact match | park/evidence failure |
| 6 | Teams/Ultra state projector | exact path + realpath confinement + allowlist field | raw projection 0 |
| 7 | `ClaudeHookRecordGuard` | session/nonce/owned dir、exclusive create、replay拒否 | record rejection |
| 8 | evidence correlator/projector | state+stream+hook ID AND、closed output schema | native success 0 |

## Credential, prompt, and settings isolation

- child envはruntime/correlation/modeと、probeが確定したauth transportに必要な既存keyだけを含む。親env全体、selectedでないprovider credential、未知transportを渡さない。
- OAuth/keychainはHOME参照だけ、API/Bedrock/Vertex/Foundryは既知transport別allowlistとし、値をaudit/error/checkpointへserializeしない。
- manifest、convergence command、workflow要求はstdin bytesとしてspawn後に1回writeしEOFを送る。argv、settings、fixture、auditへprompt/scriptを置かない。
- ephemeral settingsはattempt evidence hookだけを追加し、user/project global `.claude/settings.json`を変更しない。permissionとownershipをarm前に再検証する。
- executable/argv/env/cwd/stdinを分離し、shell command、dynamic plugin/module、Claude SDK/API clientを使わない。

## Path, identity, and evidence integrity

Agent Teamsはsession UUIDから導出したteam/task exact path、prefix reservation、full session ID、assignment tokenをcheckpoint bindingと照合する。symlink、別owner、既存path、arm直前raceを拒否し、既存directoryを削除・adoptしない。

Ultraはallowlisted workflow-created eventからrun ID/session IDを得て、profile ruleでexact state pathを導出する。U-02が`CaptureBinding`をaudit-first保存する前はstate read 0、root scan 0とする。profile/version/field pathが未確定ならparkし、最新pathを採用しない。

provider-state、process stream、hook recordは次のallowlistだけをclosed valueへprojectする。

- driver/mode/profile version、session/run/task/agent synthetic identity、status、assignment token、count/digest。
- Agent Teamsのmember/task owner関係とTaskCreated/Completed/TeammateIdle。
- Ultraのrun/task/worker relationとworkflow marker/SubagentStart/Stop。

credential、prompt、script、description、message、mailbox、assistant result、last assistant message、transcript、生absolute path/usernameはschemaに存在させない。unknown field/eventはraw保存せずprofile別countとclosed codeだけを返す。

## Threat containment and verification

| Threat | Control | Test |
|---|---|---|
| env/argv injection | transport allowlist + structured `LaunchSpec` | secret/metacharacter canary |
| hook spoof/replay | session/nonce/owner + exclusive file |別attempt/重複event fixture |
| stale/wrong team adoption | prefix lock + exact path + full UUID/token | persistent task/collision fixture |
| forged/latest Ultra run | stream-bound profile + capture checkpoint | fake run/root scan spy |
| raw data disclosure | allowlist projector + schema guard | prompt/credential/path canary |
| global mutation | ephemeral settings factory | before/after digest |
| self-report repudiation | provider-state + stream + hook AND | flag/xhigh/floor/response negative fixture |

credential/raw/path漏えい1件、global settings mutation、別session/run adoption、unprofiled Ultra successをmerge blockerにする。HTTP、cloud IAM/KMS、network security group、at-rest secret encryptionはsurfaceがないため非適用である。
