# Kiro Native Driver Security Design

## 入力契約とtrust boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。trust boundaryは既存browser/API-key auth、runtime agent config、stdin manifest、prepared worktree、local session storeからclosed C-07 domainへの入口である。credentialを取得・複製・永続化する新認証機構は作らない。

## Defense-in-depth layers

| Layer | Component | Control | Rejection point |
|---|---|---|---|
| 1 | `KiroAuthClassProjector` | auth classだけをallowlist、detail即時破棄 | probe result前 |
| 2 | `KiroSessionProfileGuard` | V2 field/type/cardinality/stdin ingestion exact profile | available前 |
| 3 | `KiroParentTrustPolicy` | read/thinking/subagent + expected role exact set | config plan前 |
| 4 | `KiroWorkerTrustPolicy` | read/write/thinking +担当worktree allow path | config plan前 |
| 5 | `KiroRuntimeConfigPlanGuard` | reserved name、exclusive create、owner/digest/realpath | provider arm前 |
| 6 | `KiroWaveManifestProjector` | Unit/path/command/specをstdin-only化 | launch前 |
| 7 | `KiroSessionInventoryProjector` | baseline後new file、suffix/profile/parent exact match | normalized event前 |
| 8 | `KiroEvidenceProjector` | ID/status/digestだけのclosed schema | C-08 handoff前 |

## Least privilege runtime agents

parent configはwrite、shell、AWS、MCPを持たず、subagent `availableAgents`/`trustedAgents`をwave expected worker role 2〜4件とexact matchする。`--trust-all-tools`を使用しない。

worker configはsubagent、shell、AWS、MCPを持たず、read/write `allowedPaths`を担当prepared worktreeへ限定する。main checkout、他worktree、evidence root、runtime config、session rootをdenyする。`allowedTools: [write]`でpath制約を上書きしない。convergence commandはC-11が実行する。

runtime configは`.kiro/agents/amadeus_kiro_[pu]_<token>.json`予約patternだけへU-02がexclusive createする。既存file、symlink、name collision、pattern外、owner/digest/realpath不一致をarm前に拒否する。cleanupはprocess terminal/capture seal後、現owner/fencing一致時だけ行い、旧configを新attemptへ再利用しない。

## Input, session, and data protection

- executable/argv/env/cwd/stdinを分離し、manifestをstdinへ1回だけwrite/EOFする。Unit/path/command/spec/promptをargv/config/auditへ置かない。
- auth probeはemail/token/account detailを投影前に破棄し、全env/config dumpを作らない。
- session parserはsession ID、cwd digest、time、agent role、parent ID、terminal statusだけをallowlistする。
- title、prompt、message、summary、tool input/output、conversation event、raw bytes、生pathを保存しない。
- dynamic plugin、Kiro SDK/direct API、global agent mutationを追加しない。

## Threat containment and verification

| Threat | Control | Test |
|---|---|---|
| default/old session spoof | baseline diff + runtime parent/role/parent ID | old/default/extra fixture |
| config tamper/reuse | exclusive path + owner/digest/fencing | symlink/collision/stale cleanup |
| parent/worker privilege escalation | closed tool/path policies | shell/AWS/MCP/nested/担当外 fixture |
| trust bypass | exact trusted set + no trust-all | extra/untrusted/approval fixture |
| raw data disclosure | allowlist projection | credential/prompt/summary/tool canary |
| self-report repudiation | versioned terminal + parent relation | file/summary-only negative fixture |

担当外/main write、secret漏えい、trust bypass、旧config/session adoption、raw session永続化をmerge blockerにする。cloud IAM/KMS/network controlはresourceがないため非適用である。
