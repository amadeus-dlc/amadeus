# Performance Design — reviewer-protocol

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。review invocationを有界な単一処理へ閉じ、新SLO、cache、pool、queueを追加しない。

## Closed pass-list construction

`reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope`をorchestrator-ownedな正準入口とする。engine directiveからstage definition、Q&A、current Unitの必須成果物、実在するoptional成果物、passed `consumes`を一度だけ列挙し、重複を除いた決定的pass-listを返す。missing optional、`memory.md`、`plan.md`、reasoning、record root、sibling Unit artifactは含めない。

reviewer invocationはこのclosed listを明示pathとして受け取り、directory scan、glob、grep、shell wildcard、browse、searchを実行しない。stage definition由来のvalidationはpass-list内成果物だけへ適用し、record全体のad-hoc scanへ拡張しない。

## Bounded spot-check path

追加readは、current Unit artifactの具体的integration ID、passed contractが解決する単一owner path、claimed shape確認に必要な非空reason、browse/search由来でない単一file path、の4条件をread前にAND評価する。承認時だけ当該invocationへ1 pathを追加し、2 file目や次iterationへの継承を認めない。

owner 0件・複数、path不一致、reason空、directoryやpatternなら追加readは0件である。workloadはsibling Unit数へ比例せず、current Unitと明示passed contractの大きさだけで有界となる。

## Runtime identity path

Review書込直前に一度だけ`date -u +%Y-%m-%dT%H:%M:%SZ`を実行する。non-zero、空、複数行、不正形式なら推定やretryで補わずReviewを確定しない。成功した単一UTC値を実checker personaとともに`runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader`へ渡す。

## Resource・verification境界

resource pool、daemon、network、database、cache、queue、background workerは追加しない。pass-list、positive/negative spot-check、date、identity、6 harness projectionをtargeted testで検査し、同一最終SHAでtypecheck、lint、dist、promote-self、full CIを通す。patch追加行はpush前local lcovで未カバー0を確認し、waiverは既決条件を満たす残余行だけに限定する。

## トレーサビリティ

本設計は`performance-requirements.md`のPERF-U08-01〜04、`security-requirements.md`のleast-privilege、`scalability-requirements.md`の有界capacity、`reliability-requirements.md`のfail-closed、`tech-stack-decisions.md`の既存Bun/TypeScript stack、`business-logic-model.md`のFlow A〜Cを実装可能な配置へ写像する。

## Review — Iteration 1

- Verdict: READY
- Reviewer: amadeus-architecture-reviewer-agent
- Date: 2026-07-21T01:46:52Z
- Iteration: 1

### Scope decision

既定のclosed pass-list（stage definition、Q&A、current Unitの5成果物）だけを対象とし、追加spot-check readは要求せず、承認pathは0件とした。`memory.md`、`plan.md`、reasoning、record root、sibling Unit、consumes元ファイルは対象外である。

### Sensor results

直前のorchestrator実測では、適用されたrequired-sections、upstream-coverage、answer-evidenceを含む検査は11/11 PASSである。Markdown-only成果物のためlinterとtype-checkは非該当である。本reviewでは、その実測結果と指定された成果物の内容を照合した。

### Findings

- Critical: なし
- Major: なし
- Minor: なし

closed pass-list、read前4条件AND、invocation限定の単一owner path、実checker personaと直前UTCによる4-field Review、6 harness/4 self-installの決定的投影、およびfail-closed動作が5成果物間で整合している。新規public API、permission、service、infrastructure、provenance storeへのscope拡張もないため、実装へ進める状態である。
