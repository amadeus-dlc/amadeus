# Unit of Work — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

## Unit Definition

| Field | Value |
|---|---|
| Name | `U001-codekb-hygiene-verification-handoff` |
| Description | CodeKB 2ファイルのcontent clean、fix lineage、lifecycle evidence、human landing後のreverification handoffを一つの追跡可能なrecordとして定義する |
| Boundary strategy | single natural unit by delivery boundary |
| Deployment model | embedded / non-deploying version-controlled record |
| Relative complexity | S |
| Runtime topology | unchanged |

`components.md` のartifact / actor boundary、`component-methods.md` の検証入出力契約、`services.md` のnon-service operational flow、`component-dependency.md` のD1〜D8証拠DAG、`decisions.md` ADR-001を1 Unitで保持する。

## Responsibilities and Deliverables

U001は次を所有する。

- 測定refとfull SHAの解決。
- `reverse-engineering-timestamp.md` と `code-structure.md` に対する4 marker語彙の行頭全数走査。
- 両ファイルの最新H2各1件、`260715-opencode-cursor-harness` 履歴H2各1件の走査。
- fix `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` の祖先性とcontent cleanの分離記録。
- CI verdict、起票者以外の独立した2名のreview、sensor、§13、gate provenance、push SHAのversion-controlled evidence。
- human landing後にlanded mainを同じ条件で再計測し、green証拠後にだけIssue closeを許容するhandoff契約。

## Boundaries

### In scope

- `requirements.md` FR-1〜FR-5、NFR-1〜NFR-4の検証仕様と証拠。
- 対象CodeKB 2ファイルのbranch hygieneとintent lifecycle record。
- fail-closedのstop条件とexternal handoffの明文化。

### Out of scope

- application / framework source、API、schema、dependency、CI policy、AWS / deployment resource、UIの変更。
- fix commitの盲目的再適用。
- conductorによるPR操作、main merge、Issue close。
- sequencing、critical path、exit conditionsの確定。これらはDelivery Planning 2.8へdeferする。

## Implementation Notes and Constraints

- 新規の実装method / serviceは作らない。既存gitと決定的な全数走査を検証ポートとする。
- ancestryとcontentは別verdictとし、どちらか一方を他方のproxyにしない。
- marker / H2不一致、測定ref不明、CI missing / non-green、起票者以外の独立reviewerが2名未満、post-landing未実施は後続handoffをfail-closedで停止する。
- unit内の証拠は一つのcommitで事実を代表させず、測定SHA、fix ancestry、record push SHAを分離する。

## Requirement Coverage

U001はFR-1〜FR-5とNFR-1〜NFR-4の全件を対象とする。詳細対応は `unit-of-work-story-map.md` に記録する。user storyは上流stageでSKIPのため0件である。

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-17T20:13:13Z
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | `unit-of-work.md` Responsibilities / Constraints; `unit-of-work-story-map.md` FR-4 mapping; `unit-of-work-dependency.md` Integration Points; `units-generation-questions.md` Integration contract | **RESOLVED** — 起票者以外の独立した2名というcardinality / eligibilityが4成果物へ明記され、2名未満または不適格時はlanding handoffをfail-closedで停止する。1名reviewをgreen evidenceとして扱う余地は解消した。 | 追加対応なし。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| fenced YAML parse / DAG check | PASS: unit 1件、duplicate 0、unresolved dependency 0、self dependency 0、cycle 0、topological order=`U001-codekb-hygiene-verification-handoff` | 修正後も必須YAMLはwell-formedで、単一Unit DAGとして有効。 |
| YAML / prose identity check | PASS: 完全名・短縮`U001`は一意解決し、proseも1 Unit / depends_on=[] / cycle 0で一致 | machine-readable topologyと3成果物・質問証跡のUnit境界に矛盾はない。 |
| iteration 1 contract closure check | PASS: Unit責務、fail-closed constraint、FR-4 coverage、dependency record、question integration contractの6箇所を確認 | Major 1件はresolved。cardinality / eligibilityの欠落はない。 |
| requirements coverage check | PASS: FR 5/5、NFR 4/4、story 0/0、orphan Unit 0、orphan requirement 0 | FR-4を含む全要件の構造・意味coverageがUnit境界へ保持された。 |
| Stage 2.7 responsibility check | PASS: sequencing、critical path、exit conditions、story implementation orderはいずれも未決または非該当として2.8へdefer | 2.7はtopologyだけを定義し、Delivery Planningの経済的順序を先取りしていない。 |
| fictional topology check | PASS: user story 0、新規service / API / event / shared mutable data / AWS / UI 0 | embedded / non-deploying recordという単一Unitは上流no-topology-change設計と一致する。 |

### Summary

Iteration 1のMajor 1件は4成果物への局所修正で閉包し、新規findingはない。単一Unit境界、YAML DAG、FR/NFR coverage、fail-closed handoff、2.8へのsequencing deferが一貫しているためREADYとする。
