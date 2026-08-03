# Architecture Decisions — Codex Duration Bounds

## Upstream Inputs

本ADR集は `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md` と、`application-design-questions.md` のQ1〜Q3を入力とする。セキュリティ・コンプライアンスは各ADRで扱う。

## ADR-01 — Harness-neutral core contractを正本にする

### Context

問題はCodexで顕在化したが、実行時間、停止性、対話反復、swarm並列性は全harnessのworkflow contractである。package面は7つ存在する。

### Options

- Option A — shared core + capability adapters: 重複policyを防ぎ、同じpredicateでconformance可能。adapter inventoryが必要。可逆性は高い。
- Option B — Codex専用gate/policy: 初期差分は小さいが、他harnessが無制限のまま残りsemanticsが分裂する。将来の統合コストが高い。

### Decision

Option Aを採用する。Codex専用blocking gateは、native lifecycle欠陥を共有factへ写像できず共通conformanceで検出不能という再現証拠がある場合だけ別途許可する。

### Consequences

全7 package面を分類し、unavailable capabilityもテストする必要がある。Codex dogfoodの改善は共有core経由で他harnessへ波及する。

### Security and Compliance

policyが一箇所になるため、auth/permission/canonical writeをretryしない境界を統一できる。新規データ収集は行わない。

### Alternatives Rejected

Codex専用gateを却下。Codexで長時間化が目立つこと自体は専用semanticsの根拠にならない。

### Reversibility

高い。adapter capabilityは追加可能で、core predicateを変えずnative factだけを拡張できる。

## ADR-02 — Audit-first eventをdurable正本にする

### Context

counterはresume/compact/process restartを越え、atomic reserveとidempotencyが必要。既存audit lockとcanonical journalがある。

### Options

- Option A — audit-first + rebuildable projections: 既存lock/監査を再利用し、state/runtime/OTelの役割が明確。foldコストがある。
- Option B — markdown state正本: 見やすいが高頻度counterで肥大化し、audit-first規律と競合。
- Option C —独立mutable JSON正本: 高速だが二重正本とlost updateを作る。

### Decision

Q1回答によりOption A。checkpointを追加する場合もcacheであり、audit replayとの差をdriftとして検出する。

### Consequences

mutationはlock内でevent append成功後だけ返る。projection failureは再buildで回復可能。event schemaとretentionを管理する。

### Security and Compliance

event payloadをID、counter、reason、availabilityへ限定し、prompt/answer/secretを保存しない。

### Alternatives Rejected

Option B/Cは二重正本またはmarkdown肥大化を生むため却下。

### Reversibility

中。durable event schemaは長期契約だが、新projectionは追加・再構築できる。

## ADR-03 — Moduleは各Boltの最初の実利用時に段階抽出する

### Context

4 Issueは依存するが独立PRで着地する。全API先行実装はspeculative、Issue別helperは重複を生む。

### Options

- Option A — #1602 Execution Contract → #1998 Convergence Policy → #1999 adapter拡張 → #1919 Pool。
- Option B — #1602で全moduleを先行実装。
- Option C — Issue別helperを最後に共通化。

### Decision

Q2回答によりOption A。

### Consequences

各PRは単独で価値とtestを持つ。後続rebase時に前段APIを実利用し、設計のずれを早期検出する。

### Security and Compliance

未使用adapterや認可面の先行着地を避ける。各Boltで実配線とtestを同時に着地する。

### Alternatives Rejected

Option Bは先行抽象、Option Cは一時的semantics分裂のため却下。

### Reversibility

高い。各段階のAPIは狭く、次Bolt前に修正可能。

## ADR-04 — Legacy値は推測せず新execution boundaryから適用する

### Context

upgrade前recordにはoperation/attempt/counterがない。時刻やaudit行数からの推定は偽の精度になる。

### Decision

Q3回答により、移行前の過去値は `legacy-unknown`、一部取得済みは `incomplete`、native取得不能は `unavailable` と区別し、更新後最初のexecutionで新rootをmintする。既存workflow stateは保持する。

### Consequences

過去と新契約の境界が明示される。resumeを不必要に拒否せず、観測値の捏造もしない。

### Security and Compliance

legacy migrationで本文を読み直したり、追加PIIを抽出しない。

### Alternatives Rejected

推定backfill、resume拒否、Intent完了まで旧挙動を継続する案を却下。

### Reversibility

高い。将来、実証可能なmigration evidenceが得られたfieldだけ別versionで追加できる。

## ADR-05 — 共通reserve遷移と中央retry分類を使う

### Context

Stop、retry、question、review、Unit attemptは同じcap境界を持つ。adapter別判断は不一致を生む。

### Decision

`current < cap`でreserve後実行、`current == cap`の次要求は非実行・非加算とする。retry allowlistはcoreが所有し、adapterは `retryClass`、`effectStatus`、`causeCode`、`sourceSurface` の4fieldだけを返す。

### Consequences

cap-1/cap/cap+1を全経路で同じproperty testへ載せられる。recoverable errorで即停止せず、未知・effect不明・exhaustionは安全停止する。

### Security and Compliance

auth、permission、validation、canonical writeは自動retry対象外。retryによる外部副作用重複を防ぐ。

### Alternatives Rejected

全error一律retry、LLM都度判断、無上限retryを却下。

### Reversibility

中。allowlistはversioned追加可能だが、既存causeの緩和にはred testとレビューを要する。

## ADR-06 — SwarmはFIFO hard-cap poolにする

### Context

現行 `amadeus-swarm.ts` はrefereeとしてstatelessで、`--concurrency` はactive slotを強制しない。

### Decision

audit-backed FIFO queue、active slot hard cap、Unitごとのdurable attempt、exactly-once releaseを共有coreに置く。native driverはdispatch/result factだけを供給する。

### Consequences

active数は常にcap以下となり、retryで別Unitへ偽装できない。queue projectionとsettle idempotency testが必要。

### Security and Compliance

worker commandの認可境界は既存のまま。poolは権限を拡大せずdispatch頻度だけを制御する。

### Alternatives Rejected

driver別queue、priorityをLLMが決める案、concurrencyだけでretry無制限の案を却下。

### Reversibility

中。FIFOから別の決定的policyへ変えるにはrequirement変更が必要だが、driver交換は容易。

## ADR-07 — 短命CLI modular monolithを維持する

### Context

本repoに常駐service/databaseはなく、AWS platformやUIの新設理由もない。

### Decision

in-process TypeScript moduleと既存Bun CLIだけを使う。network queue、database、daemon、AWS resourceを導入しない。

### Consequences

既存package/test toolchainで完結する。lockとjournalの性能は#1602 baselineで測定する。

### Security and Compliance

network egress、credential、cloud resourceを増やさないためattack surfaceと運用負荷を増やさない。

### Alternatives Rejected

external queue/database/serviceは要求に対して過剰であり却下。

### Reversibility

高い。将来、本当に分散serviceが必要な別Intentでportを置き換えられる。

## ADR-08 — Bolt/PR/rebase/labelをdelivery contractにする

### Context

改善を後段の作業自体へ波及させつつ、レビュー可能性とIssue ownershipを保つ必要がある。

### Decision

`#1602 → #1998 → #1999 → #1919` を1 Issue = 1 Bolt = 1 PRで直列実行する。着地後に後続を最新mainへrebaseし、conformanceを再実行する。`in-progress`は実着手中の1件だけ。

### Consequences

前段改善が後段実行へ入る。mergeは人間承認。既存PRがあれば重複実装せず収束へ切り替える。

### Security and Compliance

PR/mergeの不可逆境界を人間に残し、監査・label receiptを保持する。

### Alternatives Rejected

4 Issueを1 PRに束ねる案、後段を先行着手する案、複数Issueへ同時に`in-progress`を付ける案を却下。

### Reversibility

高い。未着手Boltの順序変更は新しい人間裁定で可能だが、着地済み履歴は書き換えない。

## ADR-09 — Unit terminal failure後は依存を取消し独立Unitを継続する

### Context

Unit attempt budget超過後にqueue全体を止めるか独立Unitを続けるかは、FR-05.5がApplication Designへ委ねた決定である。

### Options

- Option A — dependency-aware continue: failed Unitのtransitive dependentを取消し、独立UnitはFIFOで継続。systemic failureだけbatch全体を停止する。利用可能な成果を最大化するがpartial-failure表現が必要。
- Option B — any Unit failureでfail-fast: 単純だが独立Unitまで不必要に失い、長時間Intentの回復性を下げる。
- Option C — 常に続行: 可用性は高いがstate不整合やunknown effectでもdispatchし、安全境界を破る。

### Decision

Option A。local failureとsystemic failureを共有termination分類で分け、batch resultを `completed | partial-failure | terminated | cancelled` とする。

### Consequences

DAG reachability、queue cancellation、active result collection、batch集約の決定的testが必要。retry可能なUnitは新sequenceでFIFO末尾へ戻る。

### Security and Compliance

auth/config/canonical write/state inconsistency/unknown effectでは新規dispatchを停止し、副作用の拡大を防ぐ。

### Alternatives Rejected

Option Bは独立作業を不必要に止め、Option Cはsystemic failureで安全性を失うため却下。

### Reversibility

中。queue policy変更はuser-visibleな実行順を変えるためrequirement変更が必要だが、driver実装とは分離される。

## Decision Traceability

| ADR | Requirements | Validation |
|---|---|---|
| ADR-01 | FR-06、AC-06 | 7 harness capability conformance |
| ADR-02/04 | FR-01、NFR-02〜03 | replay/resume/legacy tests |
| ADR-03/08 | FR-07〜08 | PR、rebase、label receipts |
| ADR-05 | FR-02〜04 | cap boundary/property tests |
| ADR-06 | FR-05 | FIFO/active/retry model tests |
| ADR-09 | FR-05.5 | dependency-aware continuation table tests |
| ADR-07 | Constraints、NFR-06 | package architecture review |
