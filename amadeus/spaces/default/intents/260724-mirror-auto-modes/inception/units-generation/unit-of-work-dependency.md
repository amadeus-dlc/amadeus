# Unit Dependency DAG

> 上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`

## DAG定義

`components.md`と`component-dependency.md`のC0 leaf／C1〜C9依存を、`component-methods.md`の公開contractと`services.md`のdata flowへ合わせてUnit間の直接依存へ縮約した。`decisions.md`のruntime／distribution ownershipと`requirements.md`の安全性・配布要件を保ち、推移的な辺は記載しない。

```yaml
units:
  - name: mirror-contract-policy
    depends_on: []
  - name: mirror-state-provenance
    depends_on: [mirror-contract-policy]
  - name: mirror-github-gateway
    depends_on: [mirror-contract-policy]
  - name: mirror-operation-lifecycle
    depends_on: [mirror-state-provenance, mirror-github-gateway]
  - name: mirror-distribution-docs
    depends_on: [mirror-operation-lifecycle]
```

このblockは全5 Unitを正確に1回ずつ宣言し、自己依存、未知参照、cycleを持たない。辺は「左のUnitが`depends_on`内のUnitへ依存する」を表す。単一の推奨実装順序やcritical pathは本成果物では決めない。

## 直接依存の理由

| Consumer Unit | Provider Unit | Integration point | 根拠 |
|---|---|---|---|
| `mirror-state-provenance` | `mirror-contract-policy` | C0 state／marker／repair DTO | 永続codecは共有schemaを実装する |
| `mirror-github-gateway` | `mirror-contract-policy` | C0 Gateway／repository／failure DTO | gatewayはrepository-bound contractを実装する |
| `mirror-operation-lifecycle` | `mirror-state-provenance` | atomic transition、ownership outcome | C6 Executorとboundary driverはreceiptとprovenance guardを消費する |
| `mirror-operation-lifecycle` | `mirror-github-gateway` | repository-bound Gateway outcome | C6 Executorは許可済みremote operationをGatewayへ委譲する |
| `mirror-distribution-docs` | `mirror-operation-lifecycle` | 完成runtime、CLI／status／prompt contract | 生成対象と説明内容をruntimeの利用者面へ一致させる |

`mirror-operation-lifecycle`は`mirror-contract-policy`へ実装上importするが、Unit DAGではstate／Gatewayを経由して確立済みcontractを消費するため、推移辺を追加しない。

## Integration Contract

| Contract | Owner | Consumer | 検証 |
|---|---|---|---|
| Mirror DTO／failure union | `mirror-contract-policy` | 全runtime Unit | typecheck、union exhaustiveness |
| state transition／receipt schema | `mirror-state-provenance` | operation／lifecycle | codec contract、CAS failure injection |
| marker／ownership outcome | `mirror-state-provenance` | operation／lifecycle | candidate table tests |
| repository-bound Gateway outcome | `mirror-github-gateway` | operation／lifecycle | fake runner、explicit repository assertions |
| operation／boundary outcome、runtime rendered contract | `mirror-operation-lifecycle` | distribution/docs | failure injection、lifecycle integration、golden output |
| generated tool／skill／docs surface | `mirror-distribution-docs` | 6ハーネス | dist／promote drift tests |

Unit間でGitHub Issue本文を共有stateとして使わず、Intent recordを正本とする。C0外の内部型、private helper、temporary fileをintegration contractにしない。

## 並行開発可能性

`mirror-state-provenance`と`mirror-github-gateway`は互いに直接・推移依存を持たず、どちらも`mirror-contract-policy`のC0 contractだけを前提として独立に開発・検証できる。Gateway側はstate／provenanceを知らず、state側はremote DTOのfixtureをC0から作る。C6 Executorは両者を消費するため`mirror-operation-lifecycle`が所有し、この並行関係を壊さない。

それ以外の組合せはDAG上の到達可能性を持つため、同じintegration seamを同時に変更する場合はconsumer側がprovider contractを固定してから統合する。ここで示すのは依存の有無だけであり、どの経路を先に実装するかはDelivery Planningの判断である。

## Cycle検証

入次数0のUnitは`mirror-contract-policy`である。これを除去すると`mirror-state-provenance`と`mirror-github-gateway`が独立に解放され、両者を除去すると`mirror-operation-lifecycle`、最後に`mirror-distribution-docs`が解放される。全Unitを除去できるためcycleは0件である。
