# Unit of Work Story Map — 成果物数値の provenance ガード

上流参照: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。本intentでは正式な `stories.md` が生成されていないため、requirementsの受け入れ可能な振る舞いをdelivery scenarioとして割り当て、未存在のstory IDを捏造しない。

## Delivery scenarios

| Scenario | 利用者と成果 | Requirement trace |
| --- | --- | --- |
| DS-1 Provenance欠落の起草時検出 | 成果物authorが、enforcement対象の数値主張に根拠がないことをclaim単位のfindingで知る | FR-SEN-1〜5、FR-PRED-1〜4、NFR-1 |
| DS-2 正当な根拠の受理 | authorが、許可されたcommand/ref/SHA/相対linkを近傍へ添えてPASSを得る | FR-PRED-2〜3、FR-TST-2〜4 |
| DS-3 既存recordと軽量成果物の非騒音化 | maintainerが、pre-cutoff・ack・lightweight report・対象外で偽のblockingを受けない | FR-CUT-1〜2、FR-PRED-4、NFR-2 |
| DS-4 Mappingの再現と承認 | quality leadが、corpus標本・label・距離統計からmodeと `W` を再計算し承認できる | FR-SWP-1〜4、FR-TST-3 |
| DS-5 全harnessへの決定的配送 | maintainerが、core正本からbuildし配送先treeで同じsensor verdictとauditを確認できる | FR-DIST-1〜3、FR-TST-1、NFR-4 |
| DS-6 性能と線形性の証明 | maintainerが、100KB敵対Markdownでmedian/p95と入力倍増比の予算内を確認できる | FR-PRED-5、NFR-3 |

## Scenario-to-Unit mapping

| Scenario | `numeric-provenance-mapping-contract` (`spec`) | `numeric-provenance-sensor-cli` (`service`) | `numeric-provenance-distribution` (`packaging`) |
| --- | --- | --- | --- |
| DS-1 | claim class/mode/`W` contract | finding/verdict/manifest/stage配線 | 配送先でfindingを実証 |
| DS-2 | 正負fixtureと距離境界 | Scanner/Resolver/evaluator | 配送先PASSを実証 |
| DS-3 | 除外とlightweight mapping contract | cutoff/Classifier/skipped verdict | advisory不変を配送面で確認 |
| DS-4 | primary: sweep・labels・統計・生成mapping | mapping consumerと一致test | build後のmapping drift検査 |
| DS-5 | mapping生成物の投影可能性 | core tool/manifestを供給 | primary: build・delivery tree・CI |
| DS-6 | 敵対inputと計測条件 | primary: pure evaluator性能/線形性 | CI runnerで予算を実行 |

複数UnitにまたがるDS-1〜6は、表のprimary成果とintegration証拠を分離している。U1はcontract、U2はruntime意味論、U3は配送後の同値性を再計算せず検証する。

## Within-Unit scenario coverage

### `numeric-provenance-mapping-contract`

DS-4を中心に、DS-1〜3/5/6が必要とするmapping、fixture、測定条件をすべて提供する。内部の受け入れ確認は、固定predicateの適用、決定的sample/label、距離統計とmode算出、生成mapping一致というcontract順で整理する。これはUnit間の経済的な実装順序ではない。

### `numeric-provenance-sensor-cli`

DS-1〜3とDS-6のruntime振る舞いをprimaryで実装し、DS-4/5のconsumer面を持つ。内部の受け入れ確認は、pure seamの境界fixture、cutoff/分類、CLI verdict、性能、既存dispatcher integrationをそれぞれ独立に判定可能とする。

### `numeric-provenance-distribution`

DS-5をprimaryとし、DS-1〜4/6がcore面と配送面で同じ結果になることを検証する。内部の受け入れ確認は、build投影、byte/source-only drift、配送先fire、CI blocking集合を別々の証拠として保持する。

## Coverage verification

- DS-1〜6はすべて1つ以上のUnitへ割り当て済みである。
- 3 Unitはいずれも1つ以上のdelivery scenarioをprimaryまたはsupportとして持つ。
- FR-SEN / FR-PRED / FR-CUT / FR-SWP / FR-TST / FR-DISTとNFR-1〜4はDS-1〜6を介して未割当なしである。
- 正式なstories成果物が将来追加された場合は、そのIDをDS-1〜6へ対応付ける。現時点で仮のstory IDは作らない。
- Bolt sequence、value/risk priority、critical pathは本artifactで決めない。
