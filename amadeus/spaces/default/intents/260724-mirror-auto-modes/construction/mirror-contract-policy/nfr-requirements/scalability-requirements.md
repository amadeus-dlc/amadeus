# Scalability Requirements — mirror-contract-policy

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity Model

本Unitは単一repository／単一Intentのローカル評価であり、horizontal scaling、load balancer、distributed cacheは非適用である。capacity dimensionは固定集合の大きさと、入力増加時に探索範囲が拡大しないこととして定義する。

| ID | Dimension | Current／Target Capacity | Scaling Rule |
|---|---|---|---|
| SCL-CP-01 | config layers | 0〜3（Global、Space、Intent） | 第4層を動的探索しない |
| SCL-CP-02 | modes | 3（`off | prompt | auto`） | closed unionとしてexhaustive check |
| SCL-CP-03 | mirror operations | 3（`create | sync | close`） | generic action／plugin registryへ拡張しない |
| SCL-CP-04 | lifecycle boundary kinds | Intent Capture、phase、park、workflow completion、manual | boundary kind追加時はdecision tableとtestsを同時更新 |
| SCL-CP-05 | one completion evaluation | 最大1 operation | 最大3回の成功再評価でchain完了 |

## Growth and Concurrency Requirements

- **SCL-CP-06:** repository内のIntent数、stage数、Issue数が増えても、config resolutionはactive／explicit IntentとそのSpace／Globalだけを読む。
- **SCL-CP-07:** C2は全Intent、全receipt、GitHub Issue一覧をscanせず、coordinatorから渡されたcurrent snapshotだけを評価する。
- **SCL-CP-08:** pure policyはshared mutable stateを持たないため、並行呼出し数に依存するlockやglobal cacheを追加しない。
- **SCL-CP-09:** config I/Oの整合性は既存filesystem semanticsを使い、本Unit専用database、queue、daemonを追加しない。
- **SCL-CP-10:** completion chainはremote operationの並列化を行わず、安全上の順序create→sync→closeを維持する。

## Degradation Policy

- **SCL-CP-11:** invalid／read-failure時はoperationを生成せず、configuration warningへfail closedする。
- **SCL-CP-12:** unsupported mode／operation／boundaryを既定`prompt`へ丸めない。
- **SCL-CP-13:** 入力規模増加を理由にprovenance、安全guard、event identity fieldを省略しない。
- **SCL-CP-14:** capacity上限を超える新しいconfig layerやoperationが必要になった場合は、closed union、contract fixture、docs、全decision testを同一変更で更新する。

## Acceptance

1. workspaceに複数Space／Intentが存在しても、選択対象以外のconfig file readは0件である。
2. 100回の並行pure policy呼出しが同じinputに同じoutputを返し、global stateを変更しない。
3. unknown union variantがfallbackせずtestをfailする。
4. completion chainが安全上の順序を保ち、throughput目的のparallel remote operationを生成しない。
