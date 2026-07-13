# Driver Contract & Selection Policy NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、U-01をI/Oなしのpure policyへ閉じ、構造的な性能・security・scale・reliability targetを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. cache、pool、async処理を導入するか

[Answer]: 導入しない。driver/harness集合は固定で、入力ごとのpure recomputationが十分である。cross-run cacheやworker poolは決定性とfault isolationを弱める。処理は同期的なcanonical projectionとsingle-pass indexで構成する。

### Q2. topology canonicalizationをどのcomponentへ置くか

[Answer]: `TopologyNormalizer`へ集約し、validate、stable sort、exact dedupe、classificationを一つのpure pipelineとして提供する。selectorはnormalized topologyだけを受け、raw signalの順序や重複を再解釈しない。

### Q3. secret/data protectionをどう実装するか

[Answer]: encryption/redaction後処理ではなく、`SwarmEnvironmentProjection`が既知2 keyのpresence/classificationだけを作り、raw env/valueをdomainへ渡さない。全domain/output/error/schemaはallowlist fieldだけで構築し、secret-like fieldを型/schemaで表現不能にする。

### Q4. failure recovery patternは何か

[Answer]: retry、circuit breaker、fallback serviceを追加しない。pure input errorはtyped fail-closedで副作用0、callerは修正済みinputを再評価する。明示driver failureは代替候補へ進めず、`auto`だけがclosed candidate chainを同一評価内で進む。

### Q5. scale patternは何か

[Answer]: horizontal service scalingではなく、Unit/topology signalを`O(n log n)`/`O(n)`で扱うstateless algorithmとする。fixed driver/harness tableはimmutable shared constant、per-call mutable stateはlocal collectionだけに限定する。

### Q6. logical componentとfailure domainをどう切るか

[Answer]: input projection、request parse、topology normalization、candidate policy、capability selection、legacy resolution、registration validation、outcome schema projectionをpure componentとして分離する。各componentはvalue/errorだけを返し、failureをprocess/audit/provider層へ波及させない。

### Q7. AWS/infrastructure componentを追加するか

[Answer]: 追加しない。U-01はnetwork、storage、service、credential、deployment resourceを持たない。AWS Well-Architectedの適用結果は「cloud cost/resource/blast radius 0、local pure module」と記録し、Infrastructure Designへ架空のVPC/IAM/KMS/monitoringを渡さない。

## 曖昧性分析

- stage例のcache、queue、circuit breaker、encryptionはU-01の構成要素がないため非適用であり、設計欠落ではない。
- fixed immutable constantの共有はmutable singleton/cacheではなく、cross-call interferenceを作らない。
- `auto` candidate progressionはavailability fallback patternだが、明示driver failureやdispatch後fallbackとは区別される。
- observabilityはU-01内のlogではなく、redacted canonical outcomeをU-02へ渡すhandoffで成立する。
