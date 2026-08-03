# Intent Backlog — 長時間実行の統一的な有界化

## Upstream Inputs

- `intent-statement`: 4 Issue を一つの改善ループとして扱う目的と依存順を参照した。
- `feasibility-assessment`: 条件付き GO、三層検証、実測後の NFR 確定条件を参照した。
- `constraint-register`: 共有 predicate、adapter capability、配布、privacy、Issue hygiene の制約を各 backlog item へ配賦した。

## Prioritization Method

全 item は MoSCoW の **Must**。相対順は dependency-first と risk-first を組み合わせる。

- dependency-first: 後続の効果比較に必要な #1602 を最初にする。
- risk-first: 非終端を防ぐ #1998 を、質問／review／swarm の拡張前に置く。
- value completion: #1999 と #1919 を順に着地し、利用者対話と並列資源の両方を有界化する。

根拠のない business value／effort 数値を作らないため、WSJF や RICE の疑似点数は付けない。

## Prioritized Proto-Units

| Rank | Backlog ID | Issue / Bolt | Priority | Outcome | Depends on |
|---|---|---|---|---|---|
| 1 | PB-01 | [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602) / provenance-baseline | Must | 実行由来情報と duration の共有 schema、Codex baseline | なし |
| 2 | PB-02 | [#1998](https://github.com/amadeus-dlc/amadeus/issues/1998) / monotonic-stopping | Must | 非遷移イベントで回避できない停止 budget | PB-01 |
| 3 | PB-03 | [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999) / interaction-budgets | Must | 質問・follow-up・review の有界反復 | PB-01、PB-02 |
| 4 | PB-04 | [#1919](https://github.com/amadeus-dlc/amadeus/issues/1919) / bounded-swarm-pool | Must | swarm 同時実行と同一 Unit retry のハード上限 | PB-01、PB-02、PB-03 |
| 5 | PB-05 | Integration / cross-harness-conformance | Must | 4契約の統合 workload、全 distribution drift、影響 adapter conformance | PB-01〜PB-04 |
| 6 | PB-06 | Dogfood / fresh-session-outcome | Must | package／promote 後の fresh Codex session で改善効果を実証 | PB-05 |

## PB-01 — Provenance Baseline

### Value hypothesis

実行時間の由来を stage・agent・tool・harness・model／versionへ分解できれば、正常な長時間処理と異常反復を区別し、後続 Bolt の前後差を比較できる。

### Scope

- 共有 schema と取得不能 semantics。
- state・audit・runtime graph の相関。
- Codex 一次 workload と baseline。
- 影響 adapter conformance と全 distribution drift。

### Acceptance signal

同一 run の由来情報と duration を3記録面で相関でき、取得不能値が明示され、後続 Bolt が同じ workload を再利用できる。

### Handoff

baseline report、workload identity、schema、取得不能 capability、比較手順を PB-02〜PB-06へ渡す。

## PB-02 — Monotonic Stopping

### Value hypothesis

停止 budget が副次イベントでリセットされなければ、異常な長時間実行を予測可能な上限で終端できる。

### Scope

- #1998 の起票時回避再現。
- 決定的な単調 budget と共有 termination reason。
- 意味論的収束判定は補助的な再計画情報に限定。
- PB-01 baseline と同一 workload による treatment 比較。

### Acceptance signal

非遷移 audit／tool event を追加しても予算消費が巻き戻らず、境界値で決定した終了理由へ到達する。

### Handoff

停止 predicate、termination reason、再開条件を PB-03〜PB-06へ渡す。

## PB-03 — Interaction Budgets

### Value hypothesis

質問、follow-up、review iteration が予算を持てば、対話品質を維持しつつ無制限反復を防げる。

### Scope

- reviewer／worker の共有 prompt 契約。
- 質問、follow-up、review の予算と終了理由。
- harness の質問 rendering／native driver は adapter 責任。
- PB-01／PB-02 の観測・停止契約を利用。

### Acceptance signal

予算ちょうど、超過、途中成功、再開の各ケースが決定的に終端し、利用者が理由と残予算を識別できる。

### Handoff

対話 budget と reviewer termination reason を PB-04〜PB-06へ渡す。

## PB-04 — Bounded Swarm Pool

### Value hypothesis

同時実行と同一 Unit retry にハード上限があれば、swarm の資源・時間消費を予測できる。

### Scope

- 共有 Unit pool と concurrency cap。
- Unit slug／durable state に基づく retry identity と counter。
- cap 到達時の共有終了理由。
- harness worker driver の adapter conformance。

### Acceptance signal

session や child identity が変わっても retry count が失われず、同時実行数と retry 数が境界値を超えない。

### Handoff

pool／retry 結果と残余リスクを PB-05へ渡す。

## PB-05 — Cross-Harness Integration

### Value hypothesis

個別に正しい4契約を一つの workload で同時に検証すれば、Bolt 間の組合せ回帰を検出できる。

### Scope

- PB-01〜PB-04 の統合 workload。
- 共有 core conformance。
- 影響 adapter conformance。
- 全 supported harness の package／self-install／distribution drift。
- capability がある harness の live journey 結線。

### Acceptance signal

4契約が同時に成立し、決定的 suite が blocking green、live journey の結果が capability と分離して報告される。

## PB-06 — Fresh-Session Outcome

### Value hypothesis

更新された prompt、hook、配布面を新しい Codex session が実際に読み込んで後続 workload を完了できれば、改善が実運用へ波及したことを確認できる。

### Scope

- package／promote receipt。
- Intent park と fresh-session resume。
- Codex 一次 workload の再実行。
- PB-01 baseline と PB-05 treatment の比較報告。

### Acceptance signal

fresh session で時間、反復回数、終了理由を取得し、baseline との差と上限遵守を説明できる。

## Cross-Cutting Definition of Done

各 backlog item は次を満たすまで完了しない。

1. observed SHA と Issue 受入条件へ trace される。
2. 対照／処置または baseline／treatment を同一 workload で比較できる。
3. 共有 core conformance と影響 adapter conformance が green である。
4. 全 distribution drift check が green である。
5. telemetry に prompt 本文、secret、credential を含めない。
6. 次 Bolt worktree を最新 base へ rebase し、前段契約を再検証する。
7. 着手 Issue の `in-progress` を完了時に除去し、次の Issue だけを着手状態へ移す。

## Not Backlogged

- 全 harness 同率の性能改善。
- 全 harness live journey の mandatory 化。
- Codex 製品または model provider の変更。
- 4 Issue と無関係な最適化・prompt 改稿・swarm 機能。
- baseline 前の具体的 NFR 数値。
