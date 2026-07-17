# Reliability Requirements — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Reliability Model

本unitは`business-logic-model.md` の証拠state machineをversion-controlled record上で実行し、`business-rules.md` のexact conditionを満たさない限り次のexternal operationを許可しない。`requirements.md` NFR-1 / NFR-2が求めるreproducibility / auditabilityをquality targetとし、`technology-stack.md` のGit / Bun / Amadeus audit機構を再利用する。

常駐serviceではないためavailability percentage、SLA / SLO、RTO / RPO、MTTR / MTBF、multi-AZ、backup / restore targetは非該当である。代わりにmeasurement correctness、repeatability、failure containmentをSLIとする。

## Quality Attribute Scenarios

| ID | Stimulus / condition | Response | Measurable target |
|---|---|---|---|
| NFR-REL-1 | 同一SHA・同一command / patternで再実行 | 同じ12 count tupleを返す | 12/12 equal |
| NFR-REL-2 | MarkerまたはH2不一致 | `stop`とSHA / path / actual countを記録 | false green 0件 |
| NFR-REL-3 | CI / review / sensor / §13 / gate / pushがmissing / non-green | pre-landing handoff停止 | inadmissible gate-ready 0件 |
| NFR-REL-4 | branch名またはorigin/mainが前進 | 固定SHAのsetを完結し、新refは別setで測定 | mixed-ref field 0件 |
| NFR-REL-5 | human landing後 | landed main SHAから12値を新規再計測 | copied pre-landing count 0件 |
| NFR-REL-6 | Issueが証拠より先にCLOSED | ordering violationとして停止・報告 | close-eligible 0件 |
| NFR-REL-7 | post-landing stop後に再試行 | PreLandingEvidenceを保持し、明示した観測refでlanded検査を再実行 | implicit ref 0件 |

Functional Design Review Finding #5のnonblocking制約に対して、human handoffは再試行時の観測refを必ず明示する。同一commitを再観測する場合もrefとSHAを新しい`MeasurementRef`として記録し、暗黙に以前のIssue stateだけを書き換えない。これによりopen decisionを増やさずfail-closed性を維持する。

## Fault Containment and Recovery

- Ref解決失敗、対象path欠落、command失敗: evidenceを完成扱いせず、原因解消後にfull setを再実行する。
- Content / structure mismatch: file:lineまたはactual countを保持し、landing / closeを停止する。
- Audit / review / sensor failure: success rowを手作業で追加せず、正規toolを再実行してgreen evidenceを得る。
- Grant失効: approvalを実行せず新しいhuman / delegated authorityを待つ。
- Process interruption: auditとgit statusを読み、重複reportせず最後の正規checkpointから再開する。
- Engine doneかつmain未着地: lifecycle done / landing pending / Issue OPENを別状態で報告する。

## Observability and Evidence Requirements

各判定は次のfieldをversion-controlled recordまたはtool-owned auditへ残す。

- Measurement ref文字列とfull SHA。
- 対象path、pattern / heading category、actual count、非0時のfile:line。
- Fix SHAとancestry verdict。
- CI head SHAとcheck verdict。
- Reviewer identity / independence / verdict。
- Declared sensor id / output path / verdict。
- §13 selection、gate authority / verdict、artifact push SHA。
- Landed main ref / SHA、Issue observation state / timestamp。

新しいmetrics backend、central log、distributed trace、alertを追加しない。Version-controlled artifactとauditが観測面であり、field欠落自体をfailureとして扱う。

## Current External Evidence Boundary

2026-07-17T20:29:57Zにleaderから受領したDraft [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)のread-only証拠は、head `11a044a8a7e3acc03e099d27e5f39bfee37049a7`、Coverage Report PASS、patch 86/86=`100%`、374 files / 5284 assertions / 0 fail、e3独立再レビューblockingなしである。これは別fix面のcontextual blocker evidenceであり、U001 branch checkpoint `dc1b4a47fcb8e7ee949b5e078c32a9a7a810638c`とはheadが異なる。この値をU001の`PreLandingEvidence.ciVerdict`、main landing、Issue close eligibilityへ流用せず、当該PR headの背景証拠としてだけ保持する。test-only commitをcherry-pickせず、merge済み証拠として扱わない。

## Review

**Verdict:** READY

**Reviewer:** amadeus-architect-agent

**Date:** 2026-07-17T20:40:59Z

**Iteration:** 2

### Findings

| # | Severity | Status | Finding / Resolution |
|---|---|---|---|
| 1 | Major | RESOLVED | [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183)を別fix面のcontextual evidenceに限定し、U001のCI / landing / close evidenceへinadmissibleと明記した。 |
| 2 | Minor | RESOLVED | PR言及をMarkdown linkへ統一し、bare PR言及を0件にした。 |
| 3 | Minor | RESOLVED | single-pass検査をlinear boundedness / unbounded rescan 0件へ置換し、exactly one passを要求しないと明記した。 |

### Validation Tool Results

- 必須5成果物とQ&Aが実在し、各H2見出しは3件以上。
- 全6ファイルでconsumes 4/4を参照。
- Functional Design Review Finding #5の参照先が実在。
- `git diff --check`: PASS。
- 新規finding: 0件。Reviewはread-only、`memory.md`未読。
