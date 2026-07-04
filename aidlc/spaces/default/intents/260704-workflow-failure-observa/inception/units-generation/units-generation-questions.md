# Units Generation Questions

## 分割方針

### 上流文脈

この段階では、`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories` を入力として扱う。

`components` は、Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition の 8 component を定義している。

`component-methods` は、各 component の public method group と logical service、ADR の対応を定義している。

`services` は、新しい deployable service を追加せず、`.agents/aidlc/tools` 内の logical service boundary として扱う方針を定義している。

`component-dependency` は、Verification Traceability を evidence の read-only consumer とし、Error Audit と Subagent Status から呼ばれない依存方向を定義している。

`decisions` は、modular CLI/tooling architecture、OpenTelemetry no-op default、file-backed evidence surface、adapter-first parity、non-mutating doctor warning を採用している。

`requirements` と `stories` は、R001-R009、US001-US009、Issue #431、#432、#433、#435、OpenTelemetry core 計装を追跡している。

### 制約

この段階は Unit の依存 DAG だけを作る。

実装順、価値順、risk-first、walking skeleton first の選択は Stage 2.8 Delivery Planning で扱う。

ただし、依存関係として何が先に必要かはこの段階で定義する。

## 質問

### Q1. Unit 境界

Unit は何を軸に分けますか。

A. 8 component をそのまま 8 Unit にする。

B. 5 logical service をそのまま 5 Unit にする。

C. GitHub Issue ごとに #431、#432、#433、#435 の 4 Unit にする。

D. すべてを 1 Unit にまとめる。

E. 推奨: 3 つの大きめの Unit にする。`U001-failure-evidence-foundation` は Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition、Shared Contracts を扱う。`U002-subagent-status-audit` は Subagent Status と audit taxonomy compatibility を扱う。`U003-workflow-warning-traceability` は Conductor Warning、Verification Traceability、PR readiness traceability を扱う。

X. Other (please specify)

[Answer]: E

### Q2. Unit 粒度

Unit の大きさはどれにしますか。

A. method 単位まで細かく分ける。

B. acceptance criteria 単位まで細かく分ける。

C. すべてを 1 つの XL Unit にする。

D. 8 component をそれぞれ小さな Unit にする。

E. 推奨: AI-DLC の stage cost を考慮し、3 Unit 程度の L サイズにする。各 Unit は独立した検証証拠を持ち、Construction で追加設計を進められる粒度にする。

X. Other (please specify)

[Answer]: E

### Q3. 依存 DAG

Unit の依存関係はどう定義しますか。

A. 依存関係なしとして全 Unit を並列可能にする。

B. すべての Unit が相互依存する形にする。

C. component-dependency の依存行列を無視して、Issue 番号順に依存させる。

D. Delivery Planning の価値順をここで決める。

E. 推奨: topology だけを定義する。`U002-subagent-status-audit` は `U001-failure-evidence-foundation` に依存する。`U003-workflow-warning-traceability` は `U001-failure-evidence-foundation` と `U002-subagent-status-audit` に依存する。実装順の経済判断は 2.8 に残す。

X. Other (please specify)

[Answer]: E

### Q4. Unit 間 contract

Unit 間の contract は何を基準にしますか。

A. file path の暗黙参照だけにする。

B. network API を新設する。

C. message broker event を新設する。

D. shared mutable module state を使う。

E. 推奨: Shared Contracts の型、typed in-process interface、file-backed adapter、OpenTelemetry facade、Intent artifact evidence ref を contract にする。stdout JSON 契約は全 Unit の制約として扱う。

X. Other (please specify)

[Answer]: E

### Q5. Deployment model

Unit の deployment model はどう扱いますか。

A. Unit ごとに独立 service として deploy する。

B. Unit ごとに cloud function として deploy する。

C. OpenTelemetry collector と dashboard を Unit に含める。

D. `.coderabbit.yml` 変更や `skills/` direct edit を Unit に含める。

E. 推奨: 全 Unit を `.agents/aidlc/tools` 内の embedded CLI/tooling module として扱う。新しい runtime service、AWS infrastructure、collector、dashboard、cloud export は含めない。

X. Other (please specify)

[Answer]: E

### Q6. 横断 story の扱い

US006、US007、US009 のような横断 story はどう割り当てますか。

A. 横断 story は割り当てず、Delivery Planning へ先送りする。

B. すべて `U001` だけに割り当てる。

C. すべての Unit に完全重複で割り当てる。

D. 横断 story ごとに別 Unit を追加する。

E. 推奨: 各 Unit が自分の検証証拠と parity 境界を持ち、`U003-workflow-warning-traceability` が PR readiness checklist と Intent artifact aggregation を所有する。これにより Unit は大きめのまま、Requirement-level evidence は失わない。

X. Other (please specify)

[Answer]: E
