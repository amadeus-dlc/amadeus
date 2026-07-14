# Swarm Driver Migration External Dependency Map

## Scope

本intentは新しいruntime service、AWS resource、database、外部API integrationを追加しない。外部依存は、ローカルCLI／認証／native evidence surface、GitHubのPR／Actions／Issue、npm配布前の既存release contractに限定される。

依存mapは`requirements`のA-02、OQ-01〜OQ-04、FR-23〜FR-26、`components`のC-05〜C-07／C-12、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`を参照する。`stories`と`mockups`はscopeでSKIP済みであり、外部UX asset／approvalはない。

## Gated Dependencies

| ID | Dependency | Current evidence | Owner | Lead time reservation | Blocks | Gate / Exit condition | Mitigation / Workaround |
|---|---|---|---|---|---|---|---|
| ED-01 | Pre-code checkpoint PRのreview／merge | [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)が`main`へmerge済み | User | 完了 | B-01 Code Generation | pre-code成果物だけのPRが承認・`main`へmerge済み | 復帰点として保持。AIは後続PRのmerge判断をしない |
| ED-02 | Codex CLIと認証済みUltra-capable environment | `codex-cli 0.144.0`がPATH上に存在 | User / local Codex config | B-03 entryで1 discovery session | B-03、失敗時は全provider | resolved modelがUltraを受理し、native multi-agent surfaceとhook相関を最小live runで取得 | versionやxhighを代替証拠にしない。不能ならintentを再審議 |
| ED-03 | Claude Code CLIと認証 | Claude Code `2.1.205`。Ultra Codeのsnapshot/journal/hook相関は実測済み。headless Agent Teams不成立も実測済み | User / Claude Code | B-04 entryでinteractive PTY discovery 1 session | B-04 | Agent Teamsのexact team/task＋Task/Teammate hookをPTYで相関し、Ultra Codeの既知headless surfaceを再現可能 | B-04だけparkしB-05は続行。通常async Agent／Task floorをnative成功にしない |
| ED-04 | Kiro CLIと非対話trust／認証 | `/opt/homebrew/bin/kiro-cli`、`2.12.1` | User / Kiro CLI | B-05 entryで1 discovery session | B-05 | trust preflight、parent/child session metadata、stream、Unit全単射を取得 | B-05だけparkしB-04は続行。version文字列やfloorを代替しない |
| ED-05 | macOS credentialed live-proof slot | 手元macOSを利用可能 | User / Delivery agent | providerごと1 exclusive slot | B-03〜B-05、B-06 | 4 native modeがpublic conductor→production registry→refereeを通り、非機密evidence indexを生成 | B-04/B-05は実装を並列化しlive runだけmutex。CIへcredentialを置かない |
| ED-06 | GitHub Actions Linux | 既存push／pull_request workflow | Repository maintainers / GitHub | PR check 1回／Bolt | B-06 | deterministic unit／integration／E2E、typecheck、lint、dist／self-install drift guardがgreen | native credential jobは追加せずfake fixtureを使う。Actions outageはPENDING扱い |
| ED-07 | 0.2.0 legacy removal GitHub Issue | 未起票 | User-authorized developer | B-06内1 review／create cycle | B-06 | 日本語Issueに旧env read、compat branch、warning、legacy test、暫定docs、全harness ACがありURLを記録 | 起票不可ならB-06未完了。文書内TODOで代替しない |
| ED-08 | Existing release workflow | `release.yml` workflow_dispatch＋release-it | Maintainer | 今回publishなし | release後続、B-06はcontract確認のみ | PRからversion bump／npm publishを行わず、release invariantが既存workflowと整合 | 本intentではrelease実行しない。配布checkまでを完了条件とする |
| ED-09 | Stacked PR base同期 | [PR #960](https://github.com/amadeus-dlc/amadeus/pull/960)→[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)→[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)がopen draft。#965 CIはgreen | Developer / User review | U-02補正後にrebase 1回 | B-04 production implementation | #964がclosed transport/captureを含み、#965をその更新headへrebase後もU-03 diffにcommon runtime変更0件、CI green | 新PR/新Unitへ分裂させず、誤worktreeで編集しない。conflict時は停止し、U-02所有権を優先して解消 |

## Native Schema Discovery Contract

各provider Boltは実装前に非機密の最小live runを行い、設計済みevidence contractを実field pathへ束縛する。raw transcript、prompt本文、credential、token、provider生responseはcommitしない。保存可能なのはexecution由来ID、列挙mode、Unit mapping、completed state、digest、redacted diagnosticである。

| Driver | Required independent sources | Discovery failure |
|---|---|---|
| `codex-ultra` | resolved model／Ultra handshake + thread JSONL + attempt専用SubagentStart／Stop hook | B-03停止、intent全体を再審議 |
| `claude-agent-teams` | interactive PTYのexact team config／members／shared task + TaskCreated / TaskCompleted / TeammateIdle hook + terminal後retained state | B-04をpark |
| `claude-ultracode` | headless Dynamic Workflow snapshot + journal/stream + hookのrun/task/agent ID一致 | B-04をpark |
| `kiro-subagent` | parent／child session metadata + coordinator stream／process result | B-05をpark |

schema discovery PASSはBolt完了ではない。実装後に同じproduction pathで完全live proofを再実行し、全Unit成果、native evidence、`check`、`finalize`を揃える。

## Platform Matrix

| Platform | Role | Required evidence | Credential policy | Status semantics |
|---|---|---|---|---|
| macOS local | native capability proof、deterministic suite、distribution check | 4 native mode live proof＋Unit成果＋referee convergence | 既存local credentialを使用、保存・CI転送なし | 実行証拠がある場合だけPASS |
| GitHub Actions Linux | portable deterministic verification | fake CLI／hook／session fixture、typecheck、lint、tests、dist／self-install drift | provider credentialなし | workflow greenでPASS、outageはPENDING |
| Windows | Out of scope | 未検証を明示し、既存Windows codeの非意図変更0件 | なし | N/A。PASSや対応済みと表現しない |

## Approval and Handoff Map

| Gate | Decision owner | Input | Allowed outcomes |
|---|---|---|---|
| Delivery Planning approval | User | 4 planning artifacts、phase check、questions | Approve / Request Changes |
| Pre-code checkpoint PR | User | [PR #955](https://github.com/amadeus-dlc/amadeus/pull/955)のpre-code成果物diff、CI | Merge済み。既知の復帰点として保持 |
| U-02 recovery PR / U-03 rebase | User / Developer | [PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)のcommon seam diff、[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)のClaude-only diff、CI | Approve / Request Changes。#965へcommon runtimeを混在させない |
| Codex principal-risk gate | User | schema discovery／live failure evidence | 継続 / scope修正 / park。floor成功への読み替え不可 |
| Claude/Kiro provider block | User | blocked Boltと独立providerの状態 | blocked Bolt park、他provider続行。U-06待機 |
| Bolt PR merge | User | Bolt固有code、tests、review、evidence | Merge / Request Changes |
| 0.2.0 Issue create | User-authorized developer | 日本語title／body／AC | Create / Revise |

## Dependency Failure Policy

- 認証不足、trust不足、surface不明、必須event欠落、未認識schema、CLI downgradeをskip-as-passにしない。
- 明示driverは別driver／floorへfallbackしない。`auto`だけがdispatch前の定義済みloud fallbackを使える。
- B-03の主要前提が失敗したら他providerへ進まず、scopeを再審議する。
- B-04／B-05の片方が失敗したら該当Boltだけをparkし、独立providerは証拠獲得まで続ける。B-06は開始しない。
- U-02共通補正が未収束、またはU-03 diffへ混入している間はB-04 production implementationを開始しない。#964補正と#965 rebaseを先に完了する。
- GitHub Actions outage、PR review待ち、Issue create権限待ちはPENDINGであり、PASS／N/Aへ読み替えない。

## External Dependency Summary

最長の不確実性は外部CLIのnative evidence schemaであり、calendar上の固定日数ではなくprovider-entryのhard gateで管理する。実装開始前に失敗を発見し、成功条件を弱めず、独立providerの学習だけを継続することで手戻りとfalse completionを同時に抑える。
