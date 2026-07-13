# Kiro Native Driver Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。信頼性はbalanced partition、least-trust roles、versioned terminal session evidence、serial wave gate、referee handoffによりfalse native successとUnit dropを各0件にすることで定義する。Kiro service uptime、latency、backup、multi-regionは非適用である。

## Reliability patterns

| Pattern | Component | Invariant |
|---|---|---|
| deterministic balanced partition | wave planner | 2〜4、差1以下、flatten exact |
| attempt-owned materialization | config plan + U-02 | existing/reused configでprovider起動0 |
| capture-before-arm | session plan + U-02 | baseline/config/process checkpoint前arm 0 |
| new-session exact binding | inventory/profile projector | old/default/wrong-parent adoption 0 |
| terminal child proof | evidence correlator | file/summaryだけのcompleted 0 |
| serial dual-green gate | C-01 + conductor | C-08/C-11両green前の次wave 0 |
| terminal-before-cleanup | U-02 | process/capture seal前config cleanup 0 |
| two-phase finalization | conductor + C-11/C-01 | native evidence単独batch success 0 |

## Native wave success conjunction

各waveはparent process/session exactly 1、worker role/child 2〜4、expected Unit-role-distinct child全単射、全childのexpected parent ID/agent role/versioned completed terminal、process exit 0、parent turn terminal、capture joined/sealedをすべて要求する。

session file存在、summary本文、default agent、IDE `invoke_sub_agent`、CLI floor、V3近似、instruction自己申告は一項も代替しない。C-08 green envelopeをconductorがC-11 checkへ渡し、green resultをC-01 checkpointへ記録した後だけ当該waveを確定する。

## Failure, cleanup, and recovery

| Failure | Timing | Result | Recovery |
|---|---|---|---|
| known V2 CLI/auth/trust unavailable | pre-dispatch | explicit unavailable | fresh probe、autoのみfloor |
| parent/terminal/stdin/schema unprofileable | discovery | park | scopeへ戻す、floor禁止 |
| config collision/symlink | pre-dispatch | provider 0 | fresh role/path |
| process/approval/session/child failure | post-dispatch | failed-resumable | fresh attempt/wave |
| config cleanup failure | post-dispatch | check/次wave/success 0 | owner/fencing reconciliation |
| C-11 check red | wave gate | next wave 0 | failed-resumable |
| finalize failure | batch | success 0 | U-02/C-11 recovery |

resumeは旧process group停止、capture join、config owner/fencing reconciliation後、新attempt nonce/role/inventory/sessionで最初の未確定waveから再開する。再利用できるのはfenced C-08 resultとconductor-recorded C-11 green resultが両方あるwaveだけで、旧raw session/summary/configを再投入しない。

## Observability and verification gate

診断/live evidenceはCLI/profile、execution/attempt/wave/role/session digest、expected/observed Unit/parent/child count、closed terminal/failure、unknown schema count、Unit file/C-08/C-11/finalize digestだけを持つ。auth detail、prompt、message、summary、tool I/O、raw session、生pathを持たない。

- deterministic suiteでwave property、fake CLI/session、trust/security、resume、C-01/C-07/C-08↔C-11 direct edge 0を検証する。
- macOS opt-in live proofでCLI/IDE各2 Unitと5 Unitを実行し、2と3+2 wave、parent/child relation、serial check gate、二相finalizeをgreenにする。
- Linux CIはfake/profile/package検査、Windowsは対象外とする。
- wave invariant、least privilege、capture順序、terminal evidence、known/unknown degradation分類、secret canaryの失敗またはskipをmerge blockerにする。
