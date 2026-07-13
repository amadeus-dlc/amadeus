# Codex Native Driver Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。信頼性はruntime exact model、single-parent delegation、terminal collaboration + hook、sandbox isolation、referee handoffによりfalse native successを0件にすることで定義する。Codex service uptime、latency、backup、multi-regionは非適用である。

## Reliability patterns

| Pattern | Component | Invariant |
|---|---|---|
| two-phase model binding | `ProbeBindingBuilder` | same config/catalog seed→unpinned SessionStart→bound exact model |
| actual-run revalidation | model/session guard |本run SessionStart model/seed/final/nonce全一致 |
| single-parent topology | role binder/correlator | parent 1、Unit-role-child 1:1:1 |
| independent-source AND | JSONL collaboration + static hook |片系start/stop success 0 |
| capture-before-arm | U-02 supervisor | capture/binding/tool-policy checkpoint前arm 0 |
| terminal-before-seal | U-02 supervisor | group/hook terminal前verdict 0 |
| least-privilege sentinel | env/evidence policy | model toolへのauth/correlation/root access 0 |
| referee-authoritative completion | conductor + C-11/C-01 two-phase | native lifecycle単独success 0 |

## Native success conjunction

native successには、catalog literal `ultra`、effective effort Ultra、resolved/actual model exact一致、probe seed/finalとlaunch/session一致、JSONL parent exactly 1、全hook session ID=parent、Unit数2以上、role/start/stop/Unit count一致、Unit-role-child全単射、各childのterminal collab completed + agentsStates completed + SubagentStart/Stop、duplicate/extra/unknown 0、process/turn completed、capture joined/sealedをすべて要求する。

`xhigh`、`max`、catalog説明文、feature flag、SubagentStart/Stop片系、worktree file、parent message、plan update、Unit別複数parentは一項も代替しない。

## Failure, fallback, and recovery

| Failure | Timing | Result | Recovery |
|---|---|---|---|
| CLI/auth/catalog/multi-agent/hook unavailable | pre-dispatch | explicit unavailable | fresh probe |
| official profile/env isolation不明 | discovery | park | scopeへ戻す |
| stdin/EOF/process/JSONL/capture failure | post-dispatch | failed-resumable | fresh attempt |
| model/thread/seed/final/nonce mismatch | post-dispatch | evidence failure | fresh binding/run |
| child/role/collab/hook不一致 | post-dispatch | evidence failure | fallbackなし |
| model tool secret/root access | sentinel/run | native success 0 | profile修正まで不可 |
| main/担当外/protected spec違反 | referee | C-11 failure | authoritative recovery |

provider arm後はfloor/別driverへfallbackしない。resumeは旧provider/hook group terminate/waitとcapture seal failure確定後、新attempt/nonce/role/capture root、fresh app-server/handshakeを使う。旧thread、agent、hook、raw streamを再利用せず、C-11確定済みUnitだけを再検証して再利用する。

## Observability and verification gate

診断/live summaryはCLI/profile/catalog row digest、runtime resolved model、mode identifier、closed status、parent/child/role digest、expected/observed count、unknown count、Unit成果/C-11 envelope digestだけを持つ。email/account/token/endpoint、prompt/message/reasoning/command/transcript、生path、raw JSONLを持たない。

- fake app-server/exec/hook suiteでmodel exact/alias/default、Ultra有無、hook trust、role/collab/bijection、security sentinel、crashを網羅する。
- macOS opt-in live proofでproduction registry/C-01/conductor/C-11、2 Unit以上、runtime-resolved Ultra、terminal collab + hookをgreenにする。
- GitHub Actions Linuxはcredential不要fake/failure/package検査を必須にし、Windowsは対象外とする。
- exact model binding、one parent、Unit-role-child全単射、env/root isolation、capture順序、secret canary、C-01↔C-11 direct edge 0の失敗またはskipをmerge blockerにする。
