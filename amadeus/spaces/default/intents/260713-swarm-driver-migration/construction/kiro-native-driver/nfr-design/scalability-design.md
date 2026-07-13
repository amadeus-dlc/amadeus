# Kiro Native Driver Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。scale dimensionはUnit数`n`、wave数`w=ceil(n/4)`、baseline後session file/row数`f/r`である。Kiro service replica、remote queue、provider schedulerはU-05の所有外である。

## Balanced partition architecture

`waveCount=ceil(n/4)`、`base=floor(n/waveCount)`、`remainder=n mod waveCount`とし、wave `i`のsizeを`base + (i<remainder ? 1 : 0)`にする。入力順の連続sliceを使い、次をconstructor invariantにする。

- `flatten(waves)`が入力listと順序・集合・件数でexact一致する。
- 各waveは2〜4件、max-minは1以下、empty/1件waveは0件。
- indexは0から連続し、digestはexecution/attempt/plan/index/ordered Unitへ束縛する。

splitは`O(n)`/`O(n)`で、dynamic rebalance、sampling、drop、duplicateを行わない。

## Native wave topology and bounds

| Resource | Per wave | Batch total/concurrency |
|---|---:|---|
| parent process/session | 1 | exactly `w`、active最大1 |
| worker role/config | Unitごと1 | exactly `n` |
| distinct child session | Unitごと1 | exactly `n` |
| role set | 2〜4 | wave Unit exact set |
| session inventory | baseline後new set | raw retention 0 |

前waveのC-08 evidenceとconductor-recorded C-11 resultが両方greenになるまで、次waveのrole materialization/capture/armを行わない。C-07はhidden global queue/pool/cap、parallel parent、provider scheduler設定を追加しない。

## Data organization and isolation

session inventoryはbaseline file identity setとseal後new setの差分を作り、allowlist suffix/profileだけをprojectする。parent/child/role/statusをkey indexし、`O((f+r) log(f+r))`以下、追加memory `O(f+r)`以下にする。

wave/attemptごとにfresh nonce、role name、config path、inventory baseline、session/captureを使う。runtime configはterminal/seal後にcleanupし、cross-attempt cache/reuseを0件にする。CLI/IDEは同じcore wave planner/profile/projectorを使い、harness別実装を複製しない。

## Growth and degradation policy

最大wave size、parallel wave、V3 profile、remote execution、Unit上限変更は別Intentでtrust/session/recovery/release matrixを再設計する。

degradationは次の3分類へ閉じる。

1. 既知V2 profile上のCLI/auth/trust/agent materialization unavailable: 明示driverはhard error、`auto`だけpre-dispatch floor。
2. parent relation/completed terminal/stdin ingestion/V2 schemaをprofile化不能、V3-only、unknown schema: driver選択にかかわらずU-05 park、floor alias禁止。
3. provider arm後のprocess/session/child/cleanup/check failure: `failed-resumable`、fallback禁止。

## Scalability verification

- 全許容`n>=2`と2/4/5/8/9/13 fixtureでwave count/size/difference/flatten/digestをproperty testする。
- process/session traceでparent exactly `w`、active 1、child exactly `n`、Unit-role-child全単射を確認する。
- multi-wave conductor traceでC-08/C-11両green前の次wave materialize/armを0件にする。
- generated session sizeでoperation/object count、raw buffer 0を検証する。
- known-unavailable、unknown-profile park、post-dispatch failureを別fixtureで検証する。
