# Claude Native Driver Scalability Requirements

## 上流と適用範囲

本成果物はU-03の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。scale対象は既存swarm範囲内のUnit、Agent Teams teammate/task、Ultra workflow worker/task、provider-state/stream eventである。Claude service replica、queue、remote schedulerはU-03の管理対象外である。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| expected Unit | n | 2件以上、既存swarm上限 | exactly 1 child/task per Unit |
| stream/hook event | e | selected modeのallowlist event |逐次parse、drop/duplicate success 0 |
| state task/agent row | s | expected Unitに対応 | full bijection、余分0 |
| Claude coordinator per wave | c | 1 | exactly 1 process |
| resolve-scope mode view | m | 2 | common probe 1、各mode probe最大1 |
| prefix candidate | k | 256固定 | bounded direct lookup、root scan 0 |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U03-SCALE-01 | Agent TeamsはUnitごとにexactly 1 task/teammate、Ultraはexactly 1 task/worker agentを作る | generated bijection fixture |
| U03-SCALE-02 | Unit増加でもmissing/extra/duplicate childをdropまたは部分successにせず拒否する | boundary/property test |
| U03-SCALE-03 | normalizationは`O((n+e+s) log(n+e+s))`以下、追加memory `O(n+e+s)`以下 | operation/object count |
| U03-SCALE-04 | batch/waveにつきmode-specific Claude coordinator 1件を維持し、Unitごとのprovider processへ分解しない | process trace |
| U03-SCALE-05 | Unit wave分割と上限はC-01 selection planに従い、C-05が独自queue/pool/hidden limitを追加しない | plan/launch equality |
| U03-SCALE-06 | session collision解決は256 candidateで停止し、directory全体のscan/delete/reuseへdegradeしない | collision exhaustion fixture |
| U03-SCALE-07 | cross-attempt probe/session/state cacheを0件とし、resumeはfresh scope/session/pathを使う | repeat/resume fixture |

## Growth and change policy

Claudeのdriver追加、surface profile version追加、Unit上限変更、複数coordinator process、Linux credentialed live proofの必須化は別Intentでcontract/release matrixを更新する。profile範囲外versionをpermissive parserで吸収せず、明示profileとfixtureを追加する。

Agent Teams／Ultraの内部schedulerへparallelism値を注入しない。U-03はmanifestのUnit-child全単射を要求するだけで、providerのschedulerやmodel capacityを再実装しない。

## Degradation policy

capacity/profile/path pressureでUnit/eventをsample/dropしない。prefix候補枯渇、unknown schema、extra/missing child、capture backlog/stop failureはnative successにせず、timingに応じてpre-dispatch unavailable/parkまたはpost-dispatch failed-resumableとする。floor/xhigh/通常Agent toolを同名native driverの代替にしない。
