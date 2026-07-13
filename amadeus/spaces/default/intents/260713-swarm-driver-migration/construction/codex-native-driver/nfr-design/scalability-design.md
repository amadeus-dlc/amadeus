# Codex Native Driver Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。scale dimensionはUnit/role数`n`、JSONL/collaboration item数`j`、hook record数`h`である。Codex service replica、remote queue、model schedulerはU-04の所有外である。

## Native parent and role topology

| Resource | Cardinality | Ownership |
|---|---:|---|
| Codex adapter | provider slot exactly 1 | production registry |
| `codex exec --json` parent/thread | batch/wave exactly 1 | U-02 supervisor/Codex runtime |
| dynamic role | expected Unitごとに1 | C-06 pure role binding |
| distinct native child | expected Unitごとに1 | Codex native multi-agent |
| generic worker config |全roleで1共有 | framework source |
| process JSONL channel | runごとに1 | U-02 capture |
| hook record set | session + child start/stop | static hook/capture |

Unit数に対してUnit-role-childをexactly 1:1:1とし、extra/missing/duplicateをdrop/partial success化しない。C-06はUnitごとのparent、複数parent partition、独自queue/pool/concurrency capを追加しない。

## Data organization and bounds

role metadata、`--add-dir`、manifestは`O(n)`で構築する。JSONL/hookは逐次allowlist projectionし、thread/role/child/event keyで一度indexする。normalizationは`O((n+j+h) log(n+j+h))`以下、追加memory `O(n+j+h)`以下とする。

generic worker configはmodel、effort、sandbox、MCPを上書きせずparent設定を継承する。Unit slug/path/promptをrole fileへ複製せず、attempt固有tokenとdescriptionはargv、assignmentはstdin manifestへ限定する。

## Concurrency and isolation

- parent内部schedulerはCodexが所有し、U-04はparallelism値を設定しない。
- wave/Unit上限はC-01 planに従い、planとrole/add-dir/manifestの集合をexact matchする。
- attemptごとにfresh ProbeBinding、role token、thread、agent、capture root、hook setを使い、cross-attempt model/catalog/thread cacheを0件にする。
- provider env、model-tool env、evidence root、scratch HOME、prepared worktreeを別resource domainへ分離する。
- hookはexclusive fileで並行writeを隔離し、shared mutable JSONLやglobal capture registryを使わない。

## Growth and degradation policy

Unit上限、複数parent topology、別reasoning effort、provider/model固有role config、surface profile version追加は別Intentでclosed contract/test/release matrixを更新する。hard-coded model slugによるpartition、dynamic plugin、unknown item catch-allを導入しない。

capacity/profile圧力でJSONL/hook/childをsample/dropしない。preflightでUltra/hook/env isolationを証明できなければunavailableまたはpark、provider arm後のextra/missing childやcapture failureは`failed-resumable`とする。xhigh、floor、複数parentを同名native successへ変換しない。

## Scalability verification

- generated `n/j/h` size ladderでcardinality、operation/object countを検証する。
- process traceでbatch parent exactly 1、role/child exactly n、generic config exactly 1を確認する。
- plan/role/add-dir/manifest set equalityとUnit-role-child bijectionをproperty testする。
- parallel attempt fixtureでmodel/catalog/thread/agent/hook/capture cross-talkとglobal cacheを0件にする。
- architecture testでworker pool、queue、daemon、SDK、Unit別role config/model pinを0件にする。
