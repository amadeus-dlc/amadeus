# Team Allocation — 成果物数値の provenance ガード

上流参照: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`。本intentではteam-formation成果物がないため、既存agent personaに基づくAI-only mobを割り当てる。

## Mob allocation

| Bolt | Mob | Primary owner | Supporting responsibilities |
| --- | --- | --- | --- |
| `numeric-provenance-walking-skeleton` | `numeric-provenance-mob` | `amadeus-developer-agent` | `amadeus-architect-agent` がcontract/依存整合、`amadeus-quality-agent` がsweep label・TDD・性能・full gate、`amadeus-pipeline-deploy-agent` がbuild/delivery-tree検証を支援 |

複数BoltがないためProgram Board型の並列割当は作らない。同じBolt内でもUnit DAGを跨いだ先行実装はせず、primary ownerがcheckpoint間のhandoffと証拠整合を維持する。

## Role responsibilities

### Driver — `amadeus-developer-agent`

- 合意済みpure evaluator seamへRed testを作り、最小実装でGreenにする。
- U1のschema・fixture・受け入れ条件を変更せず、Design-time Artifact Index、sweep generator、generated mapping、runtimeを単一tool moduleへ実装する。
- core source、manifest、stage frontmatter、integration testをsurgicalに変更する。
- 生成されたdist/self-install面を直接編集・commitしない。

### Architecture navigator — `amadeus-architect-agent`

- `stage + record相対output pattern -> produces key` mappingとruntime classifier境界を検証する。
- Unit間のdirect dependencyとADR-1〜3からの逸脱を検出する。
- 新しいshared engine、service、datastore、AWS/UI面へのscope creepを拒む。

### Quality navigator — `amadeus-quality-agent`

- corpus sampleの二値labelと理由、距離統計、偽陽性率、enforcement成立を再計算する。
- Red/Green反復、境界fixture、性能・線形性、patch/project coverageを検証する。
- full suiteを最終変更後に一度実行し、flaky timeoutは対象fileのisolated rerunで真偽を分ける。

### Distribution specialist — `amadeus-pipeline-deploy-agent`

- 既存build projectionだけを使用し、全harnessのdriftとsource-only境界を検証する。
- delivery-treeからsensor fireを実行し、audit outcomeを観測する。
- release、tag、publish、PR mergeを実行しない。

## Handoff contract

- U1→U2: mapping schema、Design-time Artifact Index契約、承認fixture、W/mode受け入れ条件。
- U2→U3: greenなcore source、manifest/stage配線、対象testと性能結果。
- Mob→reviewer: requirements/design/plan trace、最終diff、全verification exit、未検証面の明示。
- Mob→approval boundary: expected demo、reviewer verdict、blocking gate結果、active Intent grant、PR/merge状態。

## Capacity and escalation

単一Boltのため並列Bolt capacityは不要である。要件・設計からの逸脱、enforcement不成立、外部不可逆操作は実装者判断で回避せず、既存エスカレーション契約へ戻す。rate limitやCI待ちはscope変更理由にしない。
