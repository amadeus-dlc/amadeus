# Application Design Questions

## 設計方針

### 上流文脈

この段階では、`requirements`、`stories`、`team-practices` を入力として扱う。

`requirements` は、audit、doctor、OpenTelemetry core 計装、subagent status、conductor-independent warning、parity boundary、verification evidence、audit taxonomy、PR readiness traceability を定義している。

`stories` は、Maintainer を主利用者、Agent と Reviewer を補助利用者として扱い、B001 を #431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装の最初の delivery slice として定義している。

`team-practices` は、walking skeleton、deterministic test、stdout JSON preservation、TypeScript strict、parity lock、`skills/` 配布境界、collector と dashboard の任意境界を定義している。

### アーキテクチャ方針

既定の設計は、`.agents/aidlc/tools` の中に明示的な境界を持つ CLI tool 群として扱う。

独立した常駐 service や cloud infrastructure は追加しない。

OpenTelemetry core 計装は中核範囲に含める。

ただし exporter、collector、dashboard、cloud infrastructure、always-on network export は範囲外にする。

parity lock は、locked file を直接変更する前に adapter または wrapper の境界を検討する。

## 質問

### Q1. アーキテクチャ様式

この設計の基本様式はどれにしますか。

A. 独立デプロイ可能な複数 service に分ける。

B. message broker を使う event-driven service architecture にする。

C. serverless cloud functions として設計する。

D. 内部境界を明示しない手続き型 CLI にする。

E. 推奨: `.agents/aidlc/tools` 内で、明示的な port と adapter を持つ modular CLI/tooling architecture にする。

X. Other (please specify)

[Answer]: E

### Q2. component 境界

component は何を軸に分けますか。

A. source file 名だけで分ける。

B. GitHub Issue だけで分ける。

C. 利用者の journey だけで分ける。

D. command 名だけで分ける。

E. 推奨: 能力境界で分ける。error audit、hook drop doctor、telemetry core、subagent status、conductor warning、verification/PR traceability、shared contracts を独立した境界にする。

X. Other (please specify)

[Answer]: E

### Q3. OpenTelemetry の設計境界

OpenTelemetry はどの範囲で組み込みますか。

A. exporter と collector setup まで今回の Intent に含める。

B. dashboard 前提を application design に含める。

C. 共通抽象を置かず、各 command に手作業で telemetry を入れる。

D. OpenTelemetry の設計をすべて後続 Intent に延期する。

E. 推奨: no-op default と test exporter seam を持つ core telemetry port/facade を作る。collector、dashboard、cloud、always-on export は範囲外にする。

X. Other (please specify)

[Answer]: E

### Q4. データ所有と永続化

失敗可観測性の証拠は、どこで読み書きしますか。

A. 新しい database を導入する。

B. cloud storage を使う。

C. telemetry と audit data を memory のみに置く。

D. single global mutable state object を使う。

E. 推奨: 既存の file-backed audit、state、runtime graph、`.aidlc-hooks-health/*.drops`、Intent artifacts を所有データ面として扱う。telemetry verification は in-memory/test exporter のみにする。

X. Other (please specify)

[Answer]: E

### Q5. component 間の連携

component 間の連携方式はどれにしますか。

A. service 間の network call にする。

B. message broker event にする。

C. local component 間で gRPC を使う。

D. shared mutable module state を使う。

E. 推奨: 明示的な型付き interface による同期的な in-process call にする。audit と telemetry の書き込みは adapter の背後に置く。

X. Other (please specify)

[Answer]: E

### Q6. parity lock と locked file

parity lock と engine file の制約はどう扱いますか。

A. locked file を先に変更し、`engineFileExceptions` を更新する。

B. review 摩擦を減らすために `.coderabbit.yml` を変更する。

C. 設計を `skills/` direct edits に移す。

D. parity は PR 直前まで無視する。

E. 推奨: adapter/wrapper seam を優先する。locked file の変更が避けられない場合は、upstream contribution または human-approved exception として記録する。明示承認なしに `engineFileExceptions` は変更しない。

X. Other (please specify)

[Answer]: E

### Q7. AWS と infrastructure の範囲

AWS や infrastructure の設計をどこまで含めますか。

A. collector deployment を設計する。

B. dashboard hosting を設計する。

C. cloud telemetry export infrastructure を設計する。

D. production AWS topology を設計する。

E. 推奨: 今回の Intent には AWS runtime infrastructure を含めない。cloud と collector は範囲外として記録し、local deterministic test seam を維持する。

X. Other (please specify)

[Answer]: E

### Q8. ADR に残す判断

`decisions.md` には、どの判断を ADR として残しますか。

A. 最終 component list だけを残す。

B. OpenTelemetry だけを残す。

C. parity だけを残す。

D. ADR は作らない。

E. 推奨: modular CLI architecture、telemetry facade/no-op default、file-backed evidence surfaces、adapter-first parity strategy、doctor warning non-mutating behavior を ADR にする。

X. Other (please specify)

[Answer]: E
