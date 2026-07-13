# Kiro Native Driver Scalability Requirements

## 上流と適用範囲

本成果物はU-05の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。scale対象は既存swarm範囲内のUnit、balanced wave、runtime role、parent/child sessionである。Kiro service replica、remote queue、provider schedulerはU-05の管理対象外である。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| expected Unit | n | 2件以上、既存swarm上限 |全件をbalanced waveへexact partition |
| wave | w | `ceil(n/4)` |各2〜4、差1以下、serial |
| parent process/session | p | 1/wave | exactly `w` total、同時最大1 |
| worker role/child session | c | Unitごと1 | exactly `n` total |
| Kiro adapter | a | 1 | closed registration |
| session rows/files | r/f | baseline後new set | allowlist projection |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U05-SCALE-01 | `waveCount=ceil(n/4)`とbalanced formulaで全Unitを2〜4件のwaveへ順序保持partitionする |全`n>=2` property |
| U05-SCALE-02 | flatten後の順序/集合/cardinalityをinputとexact matchし、drop/duplicate/empty/1件waveを0件にする | set/list property |
| U05-SCALE-03 | splitは`O(n)`、session projectionは`O((f+r) log(f+r))`以下、追加memory `O(n+f+r)`以下 | operation/object count |
| U05-SCALE-04 | active parent/waveは最大1、wave内childは2〜4、全batch childはexactly `n`とする | process/session trace |
| U05-SCALE-05 | Unit増加時も前waveのC-08/C-11 green gateを維持し、parallel waveやdynamic rebalancingを行わない | multi-wave conductor test |
| U05-SCALE-06 | runtime parent configはwaveごと1、worker configはUnitごと1で、cleanup後のcross-attempt cache/reuseを0件にする | materialization/resume fixture |
| U05-SCALE-07 | Unit上限はC-01 planを維持し、C-07がhidden global queue/pool/別capを追加しない | plan/wave equality |

## Capacity and growth policy

最大wave size変更、parallel wave、V3 profile、Kiro remote execution、Unit上限変更は別Intentでtrust/session/recovery/release matrixを再設計する。内部schedulerのparallelismやdynamic rebalancingを追加せず、現行2〜4 balanced waveをclosed contractとする。

Kiro CLIとKiro IDEは同じC-01/C-07 contractを使い、harnessごとにwave selectorやsession parserを複製しない。

## Degradation policy

capacity/trust/schema pressureでUnit/sessionをsample/dropしない。1 Unit、既知profile上のauth/trust/agent materialization unavailableはpre-dispatch hard error、`auto`だけがfloorへ進める。parent relation、completed terminal、stdin ingestionをversioned profileとして機械取得できないsurface、V3-only、unknown schemaはdriver選択にかかわらずU-05をparkし、floorへ変換しない。arm後のprocess/session/child/cleanup/check失敗はfailed-resumableとする。default agent、IDE `invoke_sub_agent`、CLI floorを`kiro-subagent` native successへ変換しない。
