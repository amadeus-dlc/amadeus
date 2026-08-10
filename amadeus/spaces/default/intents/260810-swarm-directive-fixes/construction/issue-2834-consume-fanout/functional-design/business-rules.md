# Business Rules — issue-2834-consume-fanout

入力: [`unit-of-work.md`](../../../inception/units-generation/unit-of-work.md)、[`unit-of-work-story-map.md`](../../../inception/units-generation/unit-of-work-story-map.md)、[`requirements.md`](../../../inception/requirements-analysis/requirements.md)、[`components.md`](../../../inception/application-design/components.md)、[`component-methods.md`](../../../inception/application-design/component-methods.md)、[`services.md`](../../../inception/application-design/services.md)。

## Invariants

- BR-DIR-1: fan-outは非 per-unit consumer × per-unit producerのrequired artifactにだけ適用する。
- BR-DIR-2: effective producer populationは宣言Unitのうち`succeeded`だけ。`cancelled`は候補外、`failed` / pending / unknownはblocking。
- BR-DIR-3: 宣言Unit 0件、成功Unit 0件、曖昧なoutcome、blocking Unit残存では`error`を返し、cursorを進めない。
- BR-DIR-4: path順序はstable Unit declaration order × consumer artifact declaration order。同一pathは最初の1件だけを保持する。
- BR-DIR-5: 対象経路の出力には未解決`{unit-name}`を残さない。
- BR-DIR-6: presence分類はfan-out後に行い、各pathは`consumes`か`consumes_absent`の排他的な一方だけに現れる。
- BR-DIR-7: succeeded Unitのrequired gapは`expected:false`。cancelled Unitはabsentへ変換しない。
- BR-DIR-8: reviewerは`expected:false` gapをreview開始前に拒否し、present concrete inputを全件read scopeへ保持する。
- BR-DIR-9: skeleton / `--single`の正当なplaceholder round-tripと`expected:true`契約は変更しない。
- BR-DIR-10: upstream-coverage sensor、U1 failure selector、Stop hookは変更しない。
- BR-DIR-11: U2のpure moduleはU1 moduleを直接import・変更・実行せず、orchestrator adapterから公開outcome入力だけを受け取る。
- BR-DIR-12: inventory driftはexpected / actualのconsumer・edgeを持つ専用errorにし、partial resolutionを返さずcursorを不変にする。

## Decision Table

| Declared population | Outcome projection | Required files | Result |
|---|---|---|---|
| A,B | A/B succeeded | all present | A/Bのconcrete pathsを`consumes`へstable列挙 |
| A,B | A succeeded, B cancelled | A present | Aだけを`consumes`へ列挙、Bは両fieldから除外 |
| A,B | A/B succeeded | B artifact missing | Bのconcrete pathを`consumes_absent.expected:false`へ分類 |
| A,B | B failed / pending / unknown | 任意 | `error`、fan-out directive非発行 |
| 0 | empty | 任意 | `error`、空集合成功禁止 |
| A | ambiguous mapping | 任意 | `error`、代表Unitへのfallback禁止 |

## Edge Closure Policy

stage graphから抽出したexpected inventoryはbuild-and-test 2、ci-pipeline 1、performance-validation 4、observability-setup 5、incident-response 3、deployment-pipeline 2、environment-provisioning 2の計19 edgeである。実装はconsumer名の列挙分岐ではなくproducer metadataを使い、テストが全edgeをtable-drivenに通す。

inventory差分は`consumer-edge-inventory-mismatch`としてexpected / actual consumer集合とedge集合を記録する。未解決placeholder、重複path、required gapのreviewer通過も検証失敗とする。1 stageだけの修正や、on-disk pathだけをfilterしてgreenにする実装は完了条件を満たさない。

## TDD Acceptance

- pure seamのRedで複数Unit、stable order、dedupe、cancelled、blocking、0 Unitを固定する。
- orchestrator Redで7 consumer / 19 edgeとpresence splitを固定する。
- reviewer Redでは`expected:false`を故障注入し、review開始前の拒否を実証する。
- `t116` / `t186`とupstream-coverage既存suiteを回帰gateとして実行する。
