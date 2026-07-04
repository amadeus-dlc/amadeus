# Architecture Decisions

## 上流文脈

この decisions は、`requirements`、`stories`、`team-practices` を入力として作成する。

`requirements` は、失敗可観測性、stdout JSON 契約、OpenTelemetry no-op default、parity boundary、verification evidence、PR readiness traceability を定義している。

`stories` は、B001 を first delivery slice とし、以降 B002、B003 に分ける候補を定義している。

`team-practices` は、adapter/wrapper 優先、deterministic test、TypeScript strict、`skills/` 配布境界、collector と dashboard の任意境界を定義している。

`architecture` と `component-inventory` は brownfield 時の任意入力であり、既存構造が確認できた場合は各 ADR の alternatives に追加できる。

## ADR-001: Modular CLI Architecture

## Status

Proposed.

## Context

この Intent は `.agents/aidlc/tools` の TypeScript CLI を対象にする。

新しい deployable service は要求されていない。

AI-DLC workflow の失敗証拠は、audit、doctor、runtime graph、state、Intent artifacts に残る。

OpenTelemetry core 計装は core scope だが、collector と dashboard は optional scope である。

## Decision

`.agents/aidlc/tools` 内で、明示的な port と adapter を持つ modular CLI/tooling architecture を採用する。

component は source file 名ではなく、error audit、hook drop doctor、telemetry core、subagent status、conductor warning、verification traceability、shared contracts の能力境界で分ける。

## Consequences

Positive:

- command から audit、telemetry、file I/O を adapter 経由で分離できる。
- deterministic test が書きやすくなる。
- parity lock 対象を直接変更する前に seam を検討できる。

Negative:

- 既存の手続き型 CLI に比べて interface 定義が増える。
- 小さな変更でも component 境界を意識する必要がある。

Neutral:

- deployable service は増えない。
- cloud runtime は設計対象にならない。

## Alternatives Considered

### Alternative A: 手続き型 CLI のまま拡張する

Pros:

- 初期変更量は少ない。

Cons:

- audit、telemetry、doctor warning の関心が command に散らばる。
- stdout JSON 契約の破壊を局所的に防ぎにくい。

### Alternative B: microservices に分ける

Pros:

- 独立運用や scaling を考えやすい。

Cons:

- local CLI tooling に対して過剰である。
- network failure と運用負荷を増やす。

## ADR-002: Telemetry Facade with No-op Default

## Status

Proposed.

## Context

OpenTelemetry core 計装は core scope である。

一方で、collector、dashboard、cloud infrastructure、always-on network export は scope out である。

stdout JSON 契約を持つ command に diagnostics を混ぜてはいけない。

## Decision

Telemetry Core component に core telemetry port/facade を置く。

default は no-op とする。

test exporter seam を提供し、deterministic test では in-memory/test exporter を使う。

各 command は exporter を直接扱わず、facade を呼ぶ。

## Consequences

Positive:

- no-op default 非送信を保証しやすい。
- telemetry の test seam を一箇所に集約できる。
- stdout JSON 契約への影響を抑えられる。

Negative:

- facade の設計が不十分だと、span attribute の一貫性が崩れる。

Neutral:

- collector と dashboard は後続 scope で追加できる。

## Alternatives Considered

### Alternative A: 各 command に直接 OpenTelemetry 呼び出しを置く

Pros:

- 変更箇所を command ごとに閉じやすい。

Cons:

- no-op default、test exporter、stdout JSON preservation を横断的に保証しにくい。

### Alternative B: OpenTelemetry 設計をすべて延期する

Pros:

- 今回の実装量は減る。

Cons:

- ユーザー確認済みの core scope と矛盾する。

## ADR-003: File-backed Evidence Surfaces

## Status

Proposed.

## Context

既存の AI-DLC workflow は、audit shard、`aidlc-state.md`、runtime graph、`.aidlc-hooks-health/*.drops`、Intent artifacts を使う。

新しい database や cloud storage は要求されていない。

deterministic test と local validation が重視されている。

## Decision

失敗可観測性の evidence surface は既存 file-backed surfaces に置く。

OpenTelemetry verification だけは in-memory/test exporter を使う。

新しい database、cloud storage、single global mutable state は導入しない。

## Consequences

Positive:

- 既存 workflow と検証手段に合う。
- local deterministic test がしやすい。
- PR description と Intent artifacts から evidence を追える。

Negative:

- very large audit や drops file では summary と verbose detail の分離が必要になる。

Neutral:

- 将来 collector や dashboard を入れる場合も、core evidence surface は維持できる。

## Alternatives Considered

### Alternative A: 新しい database を導入する

Pros:

- query はしやすくなる可能性がある。

Cons:

- local CLI tooling と MVP scope に対して過剰である。
- setup と migration が必要になる。

### Alternative B: cloud storage を使う

Pros:

- 共有や保管はしやすくなる可能性がある。

Cons:

- cloud infrastructure が scope out である。
- no-network default と相性が悪い。

## ADR-004: Adapter-first Parity Strategy

## Status

Proposed.

## Context

parity lock は、engine file の不用意な drift を防ぐ。

Requirements は adapter または wrapper を先に検討し、不可避な変更だけ upstream contribution または human-approved exception として記録することを求めている。

`engineFileExceptions` は人間の明示承認なしに変更してはいけない。

## Decision

locked file を直接変更する前に、adapter/wrapper seam を検討する。

locked file の変更が避けられない場合は、Intent artifact または PR 説明に upstream contribution か human-approved exception を記録する。

明示承認なしに `engineFileExceptions` を変更しない。

## Consequences

Positive:

- parity lock を尊重できる。
- review 時に例外理由を追跡できる。
- locked file 変更を最小化できる。

Negative:

- adapter/wrapper により、初期設計の indirection が増える可能性がある。

Neutral:

- 不可避な locked file 変更は完全には排除しない。

## Alternatives Considered

### Alternative A: locked file を先に変更する

Pros:

- 直接的に実装できる場合がある。

Cons:

- parity failure と review friction を増やす。
- `engineFileExceptions` の不正変更につながる。

### Alternative B: parity を PR まで無視する

Pros:

- 設計中の判断を遅らせられる。

Cons:

- PR 直前で大きな手戻りが起きる。

## ADR-005: Doctor Warning is Non-mutating

## Status

Proposed.

## Context

conductor-independent warning は、workflow 失敗候補を会話ログ以外から表面化するために必要である。

ただし doctor が state を変更すると、診断 command と workflow mutation の境界が曖昧になる。

Requirements は warning を blocking workflow error にしないことを求めている。

## Decision

doctor warning は non-mutating とする。

Conductor Warning component は run-stage/report mismatch、in-flight abandonment、runtime graph/audit contradiction を warning として返す。

doctor は state を変更せず、evidence と next action を表示する。

## Consequences

Positive:

- doctor を安全に繰り返し実行できる。
- false positive が workflow state を壊さない。
- Maintainer と Agent は evidence を見て判断できる。

Negative:

- warning の解消には別 command または人間判断が必要になる。

Neutral:

- 将来 hard error に昇格する判断は別 ADR または後続 Intent で扱う。

## Alternatives Considered

### Alternative A: doctor が state を自動修復する

Pros:

- 一部の問題は即座に解消できる。

Cons:

- 診断と mutation が混ざる。
- false positive の被害が大きい。

### Alternative B: warning を出さない

Pros:

- false positive は発生しない。

Cons:

- conductor 自己申告に依存しない失敗補足ができない。

## Decision Summary

| ADR | Decision | Main requirements | Components | Logical services | Method groups |
|---|---|---|---|---|---|
| ADR-001 | modular CLI/tooling architecture | R001-R009 | C001-C008 | S001-S005 | all method groups |
| ADR-002 | telemetry facade with no-op default | R003, NFR002, NFR003 | C004 | S001, S003, S004 | Telemetry Core Methods |
| ADR-003 | file-backed evidence surfaces | R001, R002, R004, R005, R007, R008, R009 | C002, C003, C005, C006, C007 | S002, S003, S005 | Error Audit Methods, Hook Drop Doctor Methods, Subagent Status Methods, Conductor Warning Methods, Verification Traceability Methods |
| ADR-004 | adapter-first parity strategy | R006 | C007 | S005 | Verification Traceability Methods |
| ADR-005 | doctor warning is non-mutating | R005, R009, NFR006 | C006, C008 | S003 | Conductor Warning Methods, Doctor Composition Methods |
