# Codex Native Driver Security Requirements

## 上流とdata classification

本成果物はU-04の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-04は利用者の既存Codex provider/auth解決を使うが、credentialを読取・複製・永続化する認証機構を追加しない。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| model/profile/version、thread/agent/role/status digest | internal | yes | closed versioned projection |
| provider auth/account/email/token/endpoint header | restricted | no | auth classだけallowlist |
| five correlation key/owner token | sensitive operational | digestのみ | provider/hook限定、tool envから除外 |
| prompt、agent message、reasoning、command、file change、tool result | confidential/tainted | no | stdin/raw projection外 |
| transcript path、実HOME/CODEX_HOME、worktree absolute path | sensitive local metadata | shared outputへno | digest/confinement |
| evidence root/owner marker | sensitive control data | attempt local | 0700/0600、sandbox外 |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U04-SEC-01 | app-server projectionはmodel/provider/effort/catalog/hook/auth classだけを保持し、email/token/header/全configを破棄する | secret canary 0件 |
| U04-SEC-02 | provider/hook envへ追加するのは固定5 correlation keyだけで、値をaudit/errorへserializeしない | env projection fixture |
| U04-SEC-03 | model tool/subagent shellは`inherit=\"none\"`からsafe PATH/scratch HOME/localeだけを構築し、auth、実HOME/CODEX_HOME、correlation、TMPDIRを継承しない | malicious `env` fixtureで漏えい0 |
| U04-SEC-04 | evidence rootはcwd/worktree/add-dir/scratch HOME/temp外、0700、owner marker 0600とし、model toolのread/write/listを拒否する | malicious filesystem fixture |
| U04-SEC-05 | hookは5 key完全一致、owner marker、realpathを検証し、部分envやwrong bindingでrecordを作らない | spoof/replay拒否 |
| U04-SEC-06 | hook fileはraw IDをpathへ使わずhash名、exclusive temp、fsync、atomic renameを使い、duplicateを拒否する | traversal/interleave/overwrite 0 |
| U04-SEC-07 | `--add-dir`集合をprepared worktree集合とexact matchし、main/担当外/symlink escapeを拒否する | boundary mutation 0 |
| U04-SEC-08 | prompt/manifestはstdinだけへ渡し、argv/config/audit/checkpoint/fixtureへ保存しない | process/artifact scan |
| U04-SEC-09 | JSONL/hookからmessage、reasoning、command、file change、MCP、transcript、assistant outputをprojectionしない | planted raw field 0件 |
| U04-SEC-10 | untrusted hook bypass、shell command、dynamic plugin、Codex SDK/API client、runtime dependencyを追加しない | launch/dependency guard |

## STRIDE assessment

| Threat | Exposure | Required mitigation |
|---|---|---|
| Spoofing |別model/thread/child/role/hook record偽装 | ProbeBinding seed/final、session/receiver/agent/role exact match |
| Tampering |catalog/config/hook/correlation/evidence root改変 | same-connection binding、owner marker、atomic record、capture checkpoint |
| Repudiation |Ultra/native delegationの自己申告 | model-handshake + collaboration stream + hook terminalのAND |
| Information disclosure |provider credential、prompt、message、transcript、real HOME | provider/tool env分離、stdin、closed projection、canary |
| Denial of service |hung probe、巨大JSONL、duplicate hook、extra child | total deadline、linear projection、exclusive record、bijection reject |
| Elevation of privilege |model toolによるevidence/auth/main checkout access | sandbox outside root、inherit none、prepared add-dir confinement |

## Compliance and audit

新規規制data処理を導入しないためPCI-DSS/HIPAA/GDPR適合を新たに表明しない。共通controlとしてcredential非保存、tool least privilege、sandbox separation、tamper-evident binding、redacted audit、dependency pinを証拠化する。

live evidence summaryはCLI/profile/catalog row digest、resolved model、mode identifier、parent/child digest、Unit-role-child count、check/finalize digestだけを持つ。raw JSONL、prompt、message、credential、transcriptをartifact化しない。

## Security test gate

悪意あるmodel toolの`env`とevidence root read/list/write、wrong owner/binding、partial correlation env、hook duplicate/symlink、credential/message/transcript canary、prepared外add-dir、unknown itemをfake/live suiteへ含める。credential漏えい、toolからevidence root access、hook trust bypass、main checkout mutationはmerge blockerである。
