# Claude Native Driver Security Requirements

## 上流とdata classification

本成果物はU-03の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。U-03はClaudeの既存CLI認証を使用するが、credentialを取得・複製・永続化する認証機構を新設しない。

| Data | Classification | Persistent | Control |
|---|---|---:|---|
| driver/mode/profile/version、ID/enum/count/digest | internal | yes | versioned allowlist schema |
| session/run/task/agent identity | sensitive operational | digest/合成IDのみ | exact attempt binding |
| team/task/workflow state | confidential/tainted | normalized projectionのみ | exact path + allowlist parser |
| credential/token/cookie/keychain/auth detail | restricted | no | transport別env allowlist |
| prompt、script、description、message、assistant result/transcript | confidential | no | stdin/ephemeral only、schema外 |
| home/worktree絶対path、username | sensitive local metadata | shared auditへno | confinement + digest |

## Security requirements

| ID | Requirement | Acceptance |
|---|---|---|
| U03-SEC-01 | child envはruntime/correlation/modeと既知auth transport別allowlistだけを渡し、未知transportを拒否する | planted unrelated credentialのchild/audit混入0件 |
| U03-SEC-02 | manifest/promptはstdinへ1回だけwriteし、argv/settings/audit/checkpoint/fixtureへ保存しない | command/process snapshot scan |
| U03-SEC-03 | ephemeral settingsは0600、attempt ownership marker付きで、U-03 evidence hookだけを追加する | permission/ownership fixture |
| U03-SEC-04 | hookはsession ID、nonce hash、owned evidence dirを検証し、eventごとのexclusive-create fileへallowlist fieldだけを書く | spoof/replay/interleave拒否 |
| U03-SEC-05 | Agent Teamsは予約済みteam/task exact pathだけをlstat/realpathし、symlink、別owner、root listing、既存path再利用を拒否する | path attackでprovider起動0 |
| U03-SEC-06 | Ultraはallowlisted workflow-created eventからrun/session pathを導出し、binding checkpoint前のread/scanを0件にする | forged/latest-path adoption 0 |
| U03-SEC-07 | raw state/streamからprompt、script、description、message、assistant result、transcript、生pathをprojectionしない | secret/sensitive canary 0件 |
| U03-SEC-08 | unknown profile/event/fieldはraw保存せずcountとclosed codeだけを返す | planted fieldがnative success 0 |
| U03-SEC-09 | selectedでないprovider credential、global Claude settings、project `.claude/settings.json`を変更しない | before/after digest一致 |
| U03-SEC-10 | shell command、dynamic module/plugin、Claude SDK/API client、runtime dependencyを追加しない | dependency/launch shape guard |

## STRIDE assessment

| Threat | Exposure | Required mitigation |
|---|---|---|
| Spoofing |別session/team/workflow/agentをnative childに偽装 | execution-derived identity、assignment token、state+stream ID AND |
| Tampering |task/workflow state、hook file、settings、prefix lock改変 | ownership、0600、exclusive create、canonical digest、checkpoint binding |
| Repudiation |Teams/Ultraを使用したという自己申告 | provider-state + stream + marker + exit/refereeの相関 |
| Information disclosure |credential、prompt、message、transcript、absolute path | env allowlist、stdin、normalized projection、canary scan |
| Denial of service |prefix衝突、巨大event、hung probe/capture | 256 bound、linear projection、fixed probe deadline、U-02 group recovery |
| Elevation of privilege |shell/argv injection、symlink/path traversal、global hook改変 | argv分離、realpath confinement、attempt-owned settings、no global mutation |

## Compliance and audit

新しい規制対象data flowは導入しないためPCI-DSS/HIPAA/GDPR適合を新規表明しない。共通controlはcredential非保存、least-privilege child env、attempt isolation、redacted audit、version/profile pin、secret scanningである。

live evidence indexにはdriver/mode、CLI/profile version、execution/attempt/run digest、marker/source、Unit/child count、check/finalize verdictだけを保存する。auth不足やsecret-bearing raw traceを証拠として添付しない。

## Security test gate

credential/prompt/raw response canary、unknown auth transport、symlink/ownership、同prefix別UUID、stale lock、hook spoof/replay、settings permission、unknown schema、absolute path leakageをfake/live testへ含める。漏えい1件、global settings mutation、別session adoptionはmerge blockerで、redaction failureをskipしない。
