# Driver Contract & Selection Policy NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`はU-01をI/Oなしの純粋policyへ閉じ、`requirements.md`は決定性、後方互換性、保守性、機密性、Comprehensive testを確定している。brownfieldの`technology-stack.md`もBun/TypeScript/`bun:test`/fast-checkを維持し、新しいcloud serviceやdaemonを追加しないと定める。追加の製品判断は不要である。

## 確定済み回答

### Q1. wall-clock latency SLOを新設するか

[Answer]: 新設しない。上流は実行時間/tokenの数値SLOを置かない。代わりにU-01の性能をI/O/process/filesystem access 0回、driver集合4件固定、入力信号数`n`に対するcanonical sort `O(n log n)`以下、追加永続memory `O(n)`以下というoperation/resource boundで検証する。

### Q2. capability probe時間をU-01へ含めるか

[Answer]: 含めない。U-01は既に正規化された`ProbeResult`を読むだけで、probe-once/deadline/processはU-02〜U-05が所有する。selector benchmarkへprovider latencyを混ぜない。

### Q3. secret-like env値をどう扱うか

[Answer]: env map全体を保持せず、2つの既知keyのpresenceとclosed classificationだけを入力へ投影する。旧変数の生値は`1|other`へ即時分類し、新変数の不正値もerrorへ複製しない。outcome/schema/errorはallowlist fieldだけを持つ。

### Q4. availability/SLAを定義するか

[Answer]: U-01は短命local純関数でnetwork serviceではないためavailability SLAはN/Aである。信頼性は同一canonical inputのcanonical JSON digest一致100%、不正入力時side effect 0、全closed branchのtest coverageで定義する。

### Q5. Unit数増加へどう対応するか

[Answer]: 既存swarm上限を変更しない。selectorはUnit/signalsを一括materializeし、`O(n log n)`/`O(n)`で扱う。水平scale、queue、cache、shardは追加しない。公開driver集合は4件固定で、追加はschema versionを伴う別Intentとする。

### Q6. compliance frameworkは追加適用されるか

[Answer]: 決済・PHI・個人データを新規処理しないためPCI-DSS/HIPAA/GDPR固有scopeは追加されない。適用controlはcredential非保存、監査用のredacted decision、supply-chain pin、テスト証跡であり、規制準拠を新たに表明しない。

### Q7. test strategyは何を必須にするか

[Answer]: Comprehensiveとしてtable/property/schema/invalid-state compile fixtureを使う。同一入力反復、入力順変更、全5値、全harness、topology 4分類、legacy全表、registration重複/欠落、secret canaryを含め、未知branchやskipをpassにしない。

## 曖昧性分析

- 数値wall-clock SLOを置かない上流判断と、operation count/計算量で性能を測る方針は矛盾しない。
- U-01はstateを永続化しないためRTO/RPO/backupは非適用であり、後続U-02のcrash safetyを先取りしない。
- security/complianceはlocal boundaryとsupply chainに限定され、AWS controlやnetwork encryptionを要求へ追加しない。

