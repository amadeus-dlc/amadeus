# Kiro Native Driver Security Requirements

## 上流とdata classification

本成果物はU-05の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-05はKiroの既存browser/API-key認証経路を使うが、credentialを読取・複製・永続化する認証機構を追加しない。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| execution/wave/role/session/status digest | internal | yes | closed versioned projection |
| auth email/token/account/API key | restricted | no | auth classだけallowlist |
| runtime agent config | sensitive operational | attempt/wave local | exclusive create、owner/digest、cleanup |
| worktree/session/evidence/config path | sensitive local metadata | digest/必要箇所のみ | realpath/allow-deny boundary |
| prompt、message、summary、tool input/output、raw session | confidential/tainted | no | projection前破棄 |
| manifest/convergence command/protected spec | confidential/internal | provider stdin only | argv/config/audit外 |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U05-SEC-01 | auth probeはclassだけを保持し、email/token/account detailを直ちに破棄する | secret canary 0件 |
| U05-SEC-02 | parent toolをread/thinking/subagent、worker toolをread/write/thinkingへ閉じ、shell/AWS/MCP/nested delegationを禁止する | closed config schema test |
| U05-SEC-03 | parent `availableAgents`/`trustedAgents`をexpected 2〜4 worker role集合とexact matchし、`--trust-all-tools`を使わない | extra/default/untrusted拒否 |
| U05-SEC-04 | worker read/write allowed pathは担当prepared worktreeだけ、main/他worktree/evidence/runtime config/session rootをdenyする | malicious path fixture |
| U05-SEC-05 | path制約を`allowedTools: [write]`で上書きせず、`toolsSettings.write.allowedPaths`で非対話pre-approvalする | config rejection |
| U05-SEC-06 | runtime configは予約pattern内へexclusive createし、existing/symlink/name collisionをprovider起動前に拒否する | overwrite/path escape 0 |
| U05-SEC-07 | config digest/realpath/ownerをarm前checkpointし、terminal/capture seal後にowner一致でcleanupする | stale cleanup/reuse 0 |
| U05-SEC-08 | manifestはstdinへ1回だけ渡し、Unit/worktree/command/spec/promptをargv/config/auditへ置かない | process/artifact scan |
| U05-SEC-09 | session parserはID/cwd/time/agent/parent/statusだけをallowlistし、title/prompt/message/summary/tool I/O/raw bytesを保存しない | planted raw field 0件 |
| U05-SEC-10 | dynamic plugin、Kiro SDK/direct API、runtime dependency、global agent mutationを追加しない | dependency/config guard |

## STRIDE assessment

| Threat | Exposure | Required mitigation |
|---|---|---|
| Spoofing |旧/別parent session、default agent、role偽装 | baseline後new session、parent ID、runtime role、assignment token exact match |
| Tampering |runtime config、allowed path、session metadata、wave digest改変 | exclusive create、closed schema、checkpoint digest、wave binding |
| Repudiation |subagent利用・完了のsummary自己申告 | session parent relation + agent role + terminal status + process/capture |
| Information disclosure |credential、prompt、summary、tool I/O、local path | auth class、stdin、allowlist projection、digest/canary |
| Denial of service |agent collision、approval prompt、巨大session、failed cleanup | reserved name、headless trust、bounded waves、fail-closed isolation |
| Elevation of privilege |worker shell/nested agent/担当外write、parent write | least-tool roles、trusted exact set、path deny、no trust-all |

## Compliance and audit

新規規制対象dataを扱わないためPCI-DSS/HIPAA/GDPR適合を新たに表明しない。共通controlはcredential非保存、least privilege agent、worktree isolation、attempt-owned config、redacted evidence、dependency pinである。

live evidenceはCLI/profile、wave/role/session ID digest、Unit/status/file digest、C-08/C-11/finalize verdictだけを保存する。raw session、prompt、message、summary、auth detailをartifactへ含めない。

## Security test gate

担当外/main/session/evidence/config access、nested delegation、shell/AWS/MCP、default/extra agent、`--trust-all-tools`、config symlink/collision/stale owner、credential/prompt/summary canaryをfake/live suiteへ含める。担当外write、secret漏えい、trust bypass、旧config/session再利用はmerge blockerである。
