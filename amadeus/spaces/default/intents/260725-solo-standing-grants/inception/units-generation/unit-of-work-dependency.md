# Unit of Work Dependency: Solo Standing Grant

## 入力とトポロジー方針

依存関係は Application Design の `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md` と Requirements Analysis の `requirements.md` から導出した。user-stories 成果物は存在しないため、要件をdelivery scenarioとして扱う。

本成果物は「何が何に依存するか」だけを表し、推奨実装順、critical path、価値・リスクによる優先順位は決めない。それらは Delivery Planning がこのDAGを入力に判断する。

## 依存 DAG

```yaml
units:
  - name: grant-authorization-domain
    depends_on: []
  - name: solo-gate-transaction
    depends_on: [grant-authorization-domain]
  - name: harness-contract-and-regression
    depends_on: [solo-gate-transaction]
```

直接依存は次のとおりであり、循環はない。

- `solo-gate-transaction` depends on `grant-authorization-domain`: routeとcommitはcanonical mode resolver、exact grant query、gate eligibility、receipt lookupを利用する。
- `harness-contract-and-regression` depends on `solo-gate-transaction`: 全harnessへ投影するdirective/process wire/fallback意味論は、transaction契約が確定している必要がある。

## 統合点と契約

| Provider | Consumer | Integration point | Contract |
|---|---|---|---|
| grant-authorization-domain | solo-gate-transaction | TypeScript function/API | operating mode、shared walking-skeleton classifier、候補選択、exact receipt、exact grant revalidationはtyped resultを返し、expected invalidityとfatal corruptionを区別する |
| grant-authorization-domain | solo-gate-transaction | Audit events | `GRANT_ISSUED`、`GRANT_REVOKED`、protected `GATE_AUTHORIZATION_SELECTED`を正本とし、新しいstate fieldを作らない |
| solo-gate-transaction | harness-contract-and-regression | Directive union | `gate: true`は維持し、`standing_grant_id`と`standing_grant_route_id`をall-or-noneで保持する |
| solo-gate-transaction | harness-contract-and-regression | Process wire | grant-backed approveだけがstderr空・stdout単一JSONで`approved`または`await-approval`を返す |
| solo-gate-transaction | harness-contract-and-regression | Audit/state outcome | successだけが承認・完了・advanceを行い、expected fallbackは対象audit増分0かつstage不変 |
| grant-authorization-domain | harness-contract-and-regression | Policy fixture contract | classifier実装はgrant-authorization-domainだけが所有し、harness-contract-and-regressionは投影と回帰検証だけを行う |

## 並行開発可能性

この3 Unit 間には独立集合がない。各Unitの契約が後続Unitの公開入力となるため、DAG上の有効なtopological orderingは1種類である。ただし各Unit内部では、実装と対応するfixture作成を同じ契約に対して並行に準備できる。これはUnit間依存を変更せず、実装順の推奨も意味しない。

## 不変条件

- gate requirementとauthorization sourceは別概念であり、grant用の擬似gate値を作らない。
- route receiptはexact Route Idで一意に照合し、別grantや後発grantへ差し替えない。
- commit再検証失敗は通常human gateへのtyped fallbackであり、error control flowではない。
- team modeのcandidate finder、leader、delegation、既存approve wireは本DAGの変更対象外である。
- phase-boundary、walking-skeleton、per-unit all-covered規則は認可探索より先に適用する。
- walking-skeleton classifierの実装ownerは`grant-authorization-domain`だけであり、`harness-contract-and-regression`からU1への逆向き実装依存を作らない。
