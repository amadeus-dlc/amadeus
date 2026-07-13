# Codex Native Driver Scalability Requirements

## 上流と適用範囲

本成果物はU-04の`business-logic-model.md`、`business-rules.md`、共通`requirements.md`、brownfield `technology-stack.md`を消費する。scale対象は既存swarm範囲内のUnit、dynamic role、native child、JSONL collaboration item、hook recordである。Codex service replica、remote queue、model schedulerはU-04の管理対象外である。

## Capacity dimensions

| Dimension | Symbol | Current contract | Target behavior |
|---|---:|---|---|
| expected Unit/role | n | 2件以上、既存swarm上限 | Unit-role-child exactly 1:1:1 |
| parent thread/process | p | 1/batch | exactly 1 |
| JSONL/collaboration item | j | provider output |逐次allowlist projection |
| hook record | h | session + child start/stop | expected cardinality、duplicate拒否 |
| registered Codex adapter | a | 1 | exact closed set |
| generic worker config | g | 1 |全dynamic roleで共有 |

## Scalability requirements

| ID | Requirement | Verification |
|---|---|---|
| U04-SCALE-01 | Unit数`n`に対してdynamic roleとdistinct native childを各exactly `n`件作る | generated bijection test |
| U04-SCALE-02 | native parentはUnit数にかかわらずbatchごとに1件で、Unit別processへ分解しない | process trace |
| U04-SCALE-03 | role metadata/`--add-dir`/manifestは`O(n)`、evidence normalizationは`O((n+j+h) log(n+j+h))`以下、追加memory `O(n+j+h)`以下 | operation/object count |
| U04-SCALE-04 | extra/missing/duplicate role/child/hookをdropせず、全batchをevidence failureにする | boundary/property test |
| U04-SCALE-05 | generic worker configを1件共有し、Unit slug/path/promptをrole fileへ複製しない | config/diff guard |
| U04-SCALE-06 | wave/Unit上限はC-01 planに従い、C-06がhidden queue/pool/concurrency capを追加しない | plan/launch equality |
| U04-SCALE-07 | attempt間でmodel/catalog/thread/agent/hook cacheを共有せず、resumeはfresh probe/role/captureを使う | repeat/resume fixture |

## Growth and change policy

Unit上限、複数parent topology、別reasoning effort、provider/model固有role config、surface profile versionの追加は別Intentでcontract/test/release matrixを更新する。model slugを固定したscale partitionや、Unit別`codex exec`をnative最適化として導入しない。

Codexの内部multi-agent schedulerへparallelism設定を新設しない。U-04はexpected Unitとの全単射とterminal collaboration状態を検証し、provider schedulingを再実装しない。

## Degradation policy

capacity/schema/auth圧力でUnit、JSONL、hookをsample/dropしない。extra/missing child、unknown required item、capture join失敗はpost-dispatch failed-resumable、preflightでUltra/hook/env isolationを実証不能ならunavailableまたはparkとする。xhigh、floor、複数parentを同名native successへ変換しない。
