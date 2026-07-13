# Codex Native Driver Security Design

## 入力契約とtrust boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。trust boundaryはapp-server config/catalog/auth/hooks、provider parent env、model-tool env、stdin manifest、JSONL、static hook、prepared worktree/evidence pathからclosed C-06 domainへの入口である。既存Codex authを使うがcredentialを取得・複製・永続化しない。

## Defense-in-depth layers

| Layer | Component | Control | Rejection point |
|---|---|---|---|
| 1 | `CodexProbeProjection` | model/provider/effort/catalog/hook/auth classだけをallowlist | probe binding前 |
| 2 | `ProbeBindingBuilder` | same-connection config/catalog/hook seed→resolved model final | available前 |
| 3 | `CodexHookTrustGuard` | static definition hash/source/event/enabled/trust exact profile | provider arm前 |
| 4 | `CodexCorrelationEnvProjector` | provider/hookへ固定5 key完全投影 | launch生成前 |
| 5 | `CodexToolEnvironmentPolicy` | `inherit="none"` + safe PATH/scratch HOME/locale | provider arm前 sentinel |
| 6 | `CodexEvidenceRootPolicy` | sandbox/cwd/worktree/add-dir/temp外、0700/0600 owner | capture start前 |
| 7 | `CodexWorktreeBoundaryGuard` | add-dirとprepared set全一致、realpath/symlink guard | run前後 |
| 8 | JSONL/hook projectors | versioned closed field、binding/owner/duplicate guard | normalized event前 |

## Provider, hook, and model-tool isolation

provider parentとstatic hookだけが既存provider/auth envと次の5 keyを受ける: evidence dir、capture ID、binding digest、nonce hash、owner token。値はaudit/error/checkpointへserializeせず、owner tokenはseal後に破棄する。

model-generated command/subagent shellは`inherit="none"`からsafe PATH、credentialを含まないrecord-local scratch HOME、localeだけを構築する。実HOME、`CODEX_HOME`、API/AWS/Azure/token、5 correlation key、TMPDIRを渡さず、default secret excludesを無効化しない。

evidence rootはcwd、main checkout、全prepared worktree、全`--add-dir`、scratch HOME、sandbox tempの外に置く。model toolのread/write/listが拒否され、同じprovider invocationのtrusted static hookだけがowner markerと5 keyを検証してrecordを書けることをbehavior sentinelで実証する。実証できないprofileはparkする。

## Input, path, and evidence protection

- prompt/manifest/convergence commandはstdinへ1回だけ渡し、argv/config/audit/checkpoint/fixtureへ保存しない。
- executable/argv/env/cwd/stdinを分離し、shell command、dynamic plugin、SDK/API clientを使用しない。
- `--add-dir`集合はprepared Unit worktree集合とexact matchし、main/担当外/symlink escapeを拒否する。
- hook recordはraw IDをfilenameへ使わずhash名、exclusive temp、fsync、atomic renameを使う。同一event/ID duplicateは上書きしない。
- 5 keyが全不在なら通常hookとしてrecord 0、一部だけならtrusted capture bypassとしてnonzeroにする。
- JSONL/hookからmessage、reasoning、command、file change、MCP、transcript、assistant output、生pathをprojectionしない。unknown itemはcountだけを返す。

## Threat containment and verification

| Threat | Control | Test |
|---|---|---|
| model/thread spoof | pending→bound ProbeBinding + actual SessionStart | seed/final/model/nonce mismatch |
| hook spoof/replay | static trust profile + 5 key + owner marker | partial/wrong/duplicate/symlink fixture |
| credential disclosure | provider/tool env分離 | malicious `env` sentinel |
| evidence tamper/read | sandbox外root + atomic hook record | malicious read/list/write sentinel |
| path privilege escalation | prepared/add-dir exact set + realpath | main/担当外/symlink fixture |
| Ultra repudiation | model handshake + terminal collab + hooks | xhigh/floor/message negative fixture |
| raw data leakage | closed projection + canary | prompt/message/transcript/credential scan |

credential/correlation漏えい、model toolからevidence root access、untrusted hook acceptance、main checkout mutation、raw payload永続化をmerge blockerにする。cloud IAM/KMS/network controlsはresourceがないため非適用である。
