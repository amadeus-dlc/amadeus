# Performance Requirements — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。本Unitはreviewerのread scopeとReview headerを是正するローカルprotocolであり、network serviceではない。未根拠なlatency percentileやthroughput SLOは追加しない。

## 有界実行要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U08-01 | `reviewerReadScope`はstage definition、Q&A、current Unitの実在成果物、per-unit時のpassed consumesからclosed pass-listを決定的に作る。 | missing optional、memory、plan、reasoning、record root、sibling artifactが既定listに0件。 |
| PERF-U08-02 | spot-checkは4条件ANDをread前に評価し、承認時も単一owner fileだけを当該invocationへ追加する。 | directory/glob/grep/browse/search、2 file目、次iterationへの暗黙継承が0件。 |
| PERF-U08-03 | runtime UTCはReview書込直前の単一`date -u +%Y-%m-%dT%H:%M:%SZ`出力を使う。 | 固定日付・モデル推定・複数command retryを使わず、有効な1 timestampを4-field Reviewへ渡す。 |
| PERF-U08-04 | validationはstage定義由来のtoolだけをpass-list成果物へ実行する。 | ad-hoc recursive scanとscope拡大が0件。 |

directory全走査、record全体scan、owner探索browse、無制限retryを追加しない。spot-checkの対象は承認済み単一pathであり、review workloadをsibling Unit数へ比例させない。

## Resource・verification境界

新daemon、network call、database、cache、queue、background workerを追加しない。既存のreviewer subagent、shell date command、filesystem read、validation toolだけを使う。

targeted testではpass-list構築、date command、positive/negative spot-checkを検証する。最終gateはtargeted tests、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とし、未実施・stale結果をgreenへ読み替えない。push前local lcovでpatch追加行の未カバー0を確認し、spawn blind spotは実測後に既存の計測済みmoduleへin-process seamを置く。waiverは既決の二段判定と公式証拠条件を満たす残余行だけに限定する。

## トレーサビリティ

PERF-U08-01〜04は`business-rules.md`のBR-U08-01、06〜17、`business-logic-model.md`のFlow A〜C、`requirements.md`のFR-5とNFR-1〜8、`technology-stack.md`のBun/TypeScript/test stackに対応する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-20T15:28:02Z
- **Iteration:** 1
- **Findings:** なし（Critical 0 / Major 0 / Minor 0）。
- **Confirmed — E-OC1 / Functional Design:** 質問0問の承認範囲内で、BR-U08-01〜17と正準public seam 2関数をNFRへ機械投影している。追加public API、identity fallback、failure classification、permission、保持期間、時間SLOを導入していない。
- **Confirmed — E-USSU08FD1:** 4条件closed predicate、current Unitとpassed contractだけによるsingle-owner解決、read前decision、invocation限定single path、directory/glob/grep/shell wildcard/browse/search禁止、拒否後・decision前・approved path外readのreview無効化を全成果物で一貫して維持している。既存Review/subagent/auditで追跡し、新eventを追加しない。
- **Confirmed — measurable NFRs:** network service向けの未根拠なlatency/throughput/availability/RTO/RPOを追加せず、closed pass-list、spot-check 1 file、Review 4 field、6 harness projection、違反件数0という既決の測定可能な境界へ閉じている。
- **Confirmed — verification:** NFR-5のtargeted tests、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAで全てexit 0とする。未実施・非0・stale結果を成功扱いしない。
- **Confirmed — coverage:** NFR-6のpush前local lcovによるpatch追加行未カバー0、spawn blind spot実測後のin-process seam、既決条件を満たす残余行だけのwaiverに限定しており、coverage policyを緩和していない。
- **Confirmed — stack / implementation feasibility:** Bun 1.3.13、TypeScript ESM、既存reviewer/subagent/audit、manifest-driven 6 harness projection、既存4面self-install、既存test stackを再利用する。新runtime dependency、network、database、service、UI、daemon、別provenance storeはない。
- **Sensors:** 11/11 PASS。required-sections / upstream-coverage / answer-evidenceを含むMarkdown検査はPASS、linter / type-checkはMarkdown-onlyのため非該当。
- **Scope decision:** none（追加spot-check readなし）。
