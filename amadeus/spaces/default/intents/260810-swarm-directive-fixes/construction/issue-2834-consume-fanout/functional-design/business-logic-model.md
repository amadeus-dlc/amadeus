# Business Logic Model — issue-2834-consume-fanout

入力: [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md)。

## Effective Population Resolution

非 per-unit consumer の required artifact が per-unit producer に属する場合だけ、次の順序で解決する。

1. current intent / producer stage の宣言済みUnitをstable declaration orderで取得する。
2. orchestrator adapterから公開入力として渡されたoutcome projectionと照合し、各Unitを`succeeded`、`cancelled`、blocking（`failed` / pending / unknown）へ分類する。U2のpure moduleはU1 moduleをimport・変更・直接実行せず、projection生成順序にも依存しない。
3. 宣言Unitが0件、対応が曖昧、またはblockingが1件以上なら、pathを生成せず説明可能な`error` directiveを返す。cursorは進めない。
4. `cancelled` Unitは監査投影に保持するが、required path候補には加えない。
5. `succeeded` Unitだけをeffective producer populationとしてfan-outへ渡す。成功Unitが0件なら空の成功directiveにせずfail-closedとする。

この判定はpresence checkより先に行う。Unit outcome不確定を「fileがない」と読み替えて`consumes_absent`へ落としてはならない。

## Deterministic Fan-out and Presence Split

入力はproducer所有の`ArtifactConsumeTemplate[]`と、stableな成功Unit列である。出力はUnit順 × consumer frontmatter artifact順の直積とし、同一concrete pathの2件目以降を最初の出現位置を保って除去する。

各templateではproducerの既存配置規則に従い、この限定経路の`{unit-name}`だけを実Unit slugへ置換する。置換後に`{unit-name}`が残れば内部不整合としてfail-closedする。skeleton-unresolvedや`--single` producesなど、Unit未確定を意味する別経路のplaceholderは処理対象にしない。

fan-out完了後、各concrete pathを一度だけdisk presenceで分類する。

| Presence | Directive field | Contract |
|---|---|---|
| on-disk | `consumes` | concrete pathを1回だけ列挙 |
| requiredかつ欠落 | `consumes_absent` | `expected:false`の実gap |
| cancelled Unit | どちらにも載せない | outcomeは監査投影だけに保持 |

## Mechanical Edge Inventory

実装テストはstage graphのproducer `for_each`とrequired consumeを同じ述語で抽出し、次の7 consumer / 19 edgeを固定する。

| Consumer | Per-unit producer artifacts | Count |
|---|---|---:|
| build-and-test | code-generation-plan, code-summary | 2 |
| ci-pipeline | code-summary | 1 |
| performance-validation | performance-requirements, scalability-requirements, performance-design, scalability-design | 4 |
| observability-setup | performance-design, security-design, reliability-design, monitoring-design, infrastructure-services | 5 |
| incident-response | reliability-design, security-design, deployment-architecture | 3 |
| deployment-pipeline | deployment-architecture, cicd-pipeline | 2 |
| environment-provisioning | deployment-architecture, infrastructure-services | 2 |
| **Total** |  | **19** |

stage名やartifactを個別special-caseにはせず、graph metadataからproducer cardinalityを判定する。棚卸し件数が変わった場合は無音で期待値を更新せず、`consumer-edge-inventory-mismatch`へexpected / actualのconsumer集合とedge集合を格納して`error` directiveへ変換する。partial resolutionは返さず、cursorを不変に保つ。

## Reviewer Scope Guard

reviewer runtimeはfan-out済みdirectiveを入力とし、review開始前に`consumes_absent`を検査する。`expected:false`のrequired gapが1件でもあればvalidation errorで拒否し、`consumes.filter(onDisk)`だけでscopeを縮退させない。gapがなければ、全concrete `consumes`を順序を保ってread scopeへ載せる。`expected:true`の既存optional / scope欠落契約は変更しない。

upstream-coverage sensorはpathではなくartifact slugを評価するため、本Unitはsensor実装・期待値を変更しない。

## TDD and Recovery Scenarios

- Red: 2 Unit × 2 artifactのstable展開、重複除去、部分欠落のpresence split、cancelled除外、failed / pending / unknown / 0 Unitのerrorをpure seamで実証する。
- Red: 7 consumer / 19 edgeを機械抽出し、各consumer directiveに未解決`{unit-name}`がないことを実証する。
- Red: required gapを含むreviewer scopeが従来は無音脱落することを故障注入で実証する。
- Green: pure fan-out、orchestrator consume-resolution adapter、reviewer guardの順に最小配線する。
- Regression: `t116` test 16、`t186` skeleton round-trip、upstream-coverage slug判定、U1 failure selector、Stop hookを不変に保つ。

同一snapshotへの再実行は同じ順序・同じdedupe・同じerror意味を返す。disk read失敗は部分directiveを返さずfail-closedする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:42:50Z
- **Iteration:** 1
- **Scope decision:** none

effective succeeded population、cancelled除外、blocking/unknown/zero時のfail-closed、stable Unit×artifact展開、7 consumer/19 edge、presence split、reviewer guard、placeholder互換、upstream sensor不変、U1所有面の非変更は概ね整合しています。ただし、graph inventory drift時の必須エラーを公開結果型で表現できないため、現状ではcursor不変のfail-closed実装を一意に構築できません。

### Findings

- BLOCKER | domain-entities.md — ConsumeResolutionError / business-logic-model.md — 7 consumer・19 edge inventory: graph metadataから抽出したinventoryが7 consumer/19 edgeと異なる場合は失敗すると規定されていますが、ConsumeResolutionError.codesにinventory mismatchを表す値がありません。callerはこのdiscriminated unionだけをkind:errorへ変換する契約のため、実装者は未型付け例外、既存codeの誤用、またはdrift受容のいずれかを選ぶ必要があり、fail-closed・cursor不変・監査可能性を保証できません。専用code（例: consumer-edge-inventory-mismatch）とexpected/actual consumer・edge情報を定義し、partial resolutionを返さずcallerがkind:error/cursor unchangedへ写像する規則を追加してください。
- FOLLOW-UP | business-logic-model.md — Effective Population: 「U1監査投影と照合」がU1 moduleの直接呼出しを意味しないことを明記してください。U1/U2は独立DAGかつ並行実装なので、U2は公開入力outcomesを受け取るだけとし、U1 projectionのimport・変更・実行順依存を禁止するとsemantic ownership境界が実装者に明確になります。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:43:25Z
- **Iteration:** 2
- **Scope decision:** none

前回のBLOCKERとFOLLOW-UPは解消されています。inventory driftは専用のtyped errorとexpected/actual inventory payloadで一意に表現され、partial resolutionなし・kind:error・cursor不変まで定義されました。また、OutcomeProjectionはadapterから受け取る公開入力と明記され、U2からU1へのimport・変更・直接実行・生成順依存が禁止されたため、独立DAG、並行実装、semantic ownership境界とも整合しています。

### Findings

- None
