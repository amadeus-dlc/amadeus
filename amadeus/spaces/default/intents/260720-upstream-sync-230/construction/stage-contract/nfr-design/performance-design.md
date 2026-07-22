# Performance Design — stage-contract

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。pure schema/graph pipelineを単一語彙と検証済みsnapshotへ閉じる。

## Contract pipeline

内部parserが追加5 fieldと`produces_kinds`を一度読み、`validateStageFrontmatter(raw, context)`がexact-shapeと参照整合をmutation前に検証する。`normalizeUnitKind(raw)`はlib単一のclosed 5語彙だけを返す。`compileStageGraph(stages)`は検証済みstageだけをtyped snapshotへ投影する。

追加field absent時はpropertyを生成せず、値・配列順・表記をtrim/sort/dedupeしない。parse→emit→parseはtyped-value同値、追加field未使用stageはbyte-identicalとする。graph/directive/sensor側に第二parserや第二語彙を置かない。

## Kind pruning path

内部`filterProducesByKind`はrequired+optional候補unionへ一度だけ適用する。`requiredArtifactsForUnit(stage, kind)`はfilter後のrequired subsetだけを返し、directiveとcoverage/approval guardが同じtyped snapshotとfilter resultを共有する。

kind未指定またはmap未指定は元full matrixを返す。map未掲載artifactは全kindへ適用する。directiveだけpruneしcoverageはfull matrixという非対称を作らない。

## Coverage boundaries

stage元required 0は実行証拠なしとしてvacuousにしない。kind filter後required 0だけを当該Unitでcoveredとする。applicable requiredが一つでもあれば全file実在までuncovered、optionalはdirective候補でもcoverage exemptとする。

## Verification・resource境界

table-driven schema/pruning、round-trip、golden bytes、mixed tagged/untagged DAG、vacuous/non-vacuous、approval guardを検証する。new dependency、service、network、database、schema DSL、when evaluatorを追加しない。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U01-01〜04、`security-requirements.md`のinput integrity、`scalability-requirements.md`の5/12/6/4 closed set、`reliability-requirements.md`のcorrectness invariants、`tech-stack-decisions.md`のBun/schema stack、`business-logic-model.md`のContract pipeline/Coverage treeへ対応する。

## Review — Iteration 1

- Verdict: READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T02:49:17Z
- Iteration: 1

### Scope decision

既定のclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

orchestrator実測では、適用されたrequired-sections、upstream-coverage、answer-evidenceを含む検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と指定された成果物の内容を照合した。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

UnitKindのclosed 5語彙、追加5 fieldのexact-shapeとabsent property非生成、承認済み4 public seam、required/optional unionの単一filter、kindless/mapless full matrix、filter後required 0だけのvacuous coverage、および5/12/6/4の決定的投影が5成果物間で整合している。新規canonicalization、kind mapping、when evaluator、schema DSL、dependency、serviceへのscope拡張もないため、実装へ進める状態である。
